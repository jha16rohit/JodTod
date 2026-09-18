"""
JodTod Authentication - Login Service

Password login validates credentials and opens a session directly:

    POST /auth/login  validates identifier + password, creates the
                      device Session and returns the standard
                      AuthResponse (user + access/refresh tokens).

No login OTP is required for email/password login. Phone OTP
(passwordless) and signup email verification continue to use the
existing OTP infrastructure.

Responsibilities of this module:
    - Normalize the login identifier (email or phone)
    - Look up the corresponding User record
    - Ensure the account is allowed to authenticate
    - Verify the supplied password using backend/core/security.py
    - Open the device session and issue tokens

Important:
    - Plaintext passwords are never persisted or compared manually.
    - All authentication failures return the same generic error so
      callers cannot distinguish "unknown account" from "wrong
      password" (no account enumeration).
    - Session/token creation uses SessionService.issue_session,
      shared with signup and OTP verification flows.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.core.jwt import create_access_token
from backend.core.security import verify_password
from backend.database import transaction
from backend.models.user import AccountStatus, User
from backend.schemas.auth import AuthResponse, LoginRequest, TokenResponse
from backend.schemas.user import AuthenticatedUser, with_provider_flags
from backend.services.session_service import SessionService
from backend.services.user_service import UserService


# ++++++++++++++++ EXCEPTIONS ++++++++++++++++
class LoginError(Exception):
    """Base class for login failures."""

    code = "LOGIN_ERROR"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class InvalidLoginError(LoginError):
    """Generic authentication failure.

    Raised for every login failure (unknown identifier, wrong
    password, inactive/suspended account, missing password hash)
    so the API response never reveals which check failed.
    """

    code = "INVALID_CREDENTIALS"


# ++++++++++++++++ ACCOUNT ELIGIBILITY ++++++++++++++++
def _ensure_account_may_authenticate(user: User) -> None:
    """Raise InvalidLoginError when the account may not log in.

    Freshly signed-up accounts are PENDING (email verification is a
    separate flow), so PENDING accounts may still authenticate.
    Suspended/disabled/deleted or soft-deactivated accounts may not.
    """

    if not user.is_active:
        raise InvalidLoginError("Invalid credentials.")

    if user.deleted_at is not None:
        raise InvalidLoginError("Invalid credentials.")

    if user.account_status in (
        AccountStatus.SUSPENDED,
        AccountStatus.DISABLED,
        AccountStatus.DELETED,
    ):
        raise InvalidLoginError("Invalid credentials.")

    if user.password_hash is None:
        raise InvalidLoginError("Invalid credentials.")


# ++++++++++++++++ LOGIN (CREDENTIALS -> SESSION) ++++++++++++++++
async def login_with_password(
    db: AsyncSession,
    payload: LoginRequest,
    *,
    device_id: str | None = None,
    device_name: str | None = None,
    platform: str | None = None,
    app_version: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuthResponse:
    """
    Validate identifier + password and open an authenticated session.

    Email/password login no longer dispatches an EMAIL_LOGIN OTP.
    A valid credential pair immediately creates the device Session
    and returns the standard AuthResponse.

    Raises:
        InvalidLoginError: For every authentication failure, using a
            generic message that reveals nothing about the account.

    Returns:
        AuthResponse: The authenticated session response containing
            access and refresh tokens, and user info.
    """

    identifier = (payload.identifier or "").strip()

    if not identifier:
        raise InvalidLoginError("Invalid credentials.")

    if not payload.password:
        raise InvalidLoginError("Invalid credentials.")

    resolved_device = (device_id or "").strip()
    if not resolved_device:
        raise InvalidLoginError("Invalid credentials.")

    # NOTE: the user lookup runs INSIDE the transaction below. A SELECT
    # autobegins a transaction on the AsyncSession; doing the lookup
    # before transaction(db) would leave the whole step joined to an
    # uncommitted autobegun transaction. Session creation participates
    # in the same boundary via SessionService.issue_session (flush only).
    async with transaction(db):
        user = await UserService.get_by_identifier(
            db=db,
            identifier=identifier,
        )

        if user is None:
            raise InvalidLoginError("Invalid credentials.")

        _ensure_account_may_authenticate(user)

        assert user.password_hash is not None  # narrowed above

        if not verify_password(payload.password, user.password_hash):
            raise InvalidLoginError("Invalid credentials.")

        session, refresh_token = await SessionService.issue_session(
            db,
            user,
            resolved_device,
            device_name=device_name,
            platform=platform,
            app_version=app_version,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        access_token = create_access_token(
            user_id=user.id,
            session_id=session.id,
        )

        user.last_login_at = datetime.now(timezone.utc)

    await db.refresh(user)

    return AuthResponse(
        user=with_provider_flags(
            AuthenticatedUser.model_validate(user),
            google_subject=user.google_subject,
            apple_subject=user.apple_subject,
        ),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_seconds,
            refresh_expires_in=settings.refresh_token_expire_seconds,
            session_id=session.id,
        ),
    )