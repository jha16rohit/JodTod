"""
JodTod Authentication - Login Service

Responsibilities:
    - Normalize the login identifier (email or phone)
    - Look up the corresponding User record
    - Ensure the account is allowed to authenticate
    - Verify the supplied password using backend/core/security.py
    - Create a new authenticated device Session
    - Generate access/refresh authentication credentials
    - Persist only the refresh-token hash
    - Update the last-login timestamp

Important:
    - Plaintext passwords are never persisted or compared manually.
    - Raw refresh tokens are never persisted.
    - All authentication failures return the same generic error so
      callers cannot distinguish "unknown account" from "wrong
      password" (no account enumeration).
    - This service contains business logic only.
    - FastAPI route handling belongs in auth_login.py.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.core.jwt import create_access_token
from backend.core.security import (
    generate_secure_token,
    hash_token,
    verify_password,
)
from backend.database import transaction
from backend.models.session import Session
from backend.models.user import AccountStatus, User
from backend.schemas.auth import AuthResponse, LoginRequest, TokenResponse
from backend.schemas.user import AuthenticatedUser, with_provider_flags
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


# ++++++++++++++++ LOGIN ++++++++++++++++
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
    Authenticate a user with an identifier + password and open a new
    device session.

    Responsibilities:
    - Normalize the identifier and resolve the User record.
    - Ensure the account exists and may authenticate.
    - Verify the password hash via backend/core/security.py.
    - Create the authenticated Session bound to the device.
    - Generate access (JWT) and refresh credentials.
    - Persist only the refresh-token hash.
    - Update the last-login timestamp atomically.

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

    resolved_device_id = (device_id or "").strip()

    if not resolved_device_id:
        raise InvalidLoginError("Invalid credentials.")

    # NOTE: the user lookup runs INSIDE the transaction below. A SELECT
    # autobegins a transaction on the AsyncSession, so looking the user
    # up before entering transaction(db) would make session.begin()
    # raise "A transaction is already begun on this Session".
    # (Same structure as create_account in auth_signup_service.py.)
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

        now = datetime.now(timezone.utc)

        refresh_token = generate_secure_token(48)

        session_expires_at = (
            now
            + timedelta(
                days=settings.refresh_token_expire_days
            )
        )

        session = Session(
            user_id=user.id,
            device_id=resolved_device_id,
            device_name=device_name,
            platform=platform,
            app_version=app_version,
            refresh_token_hash=hash_token(
                refresh_token
            ),
            token_family_id=uuid.uuid4(),
            expires_at=session_expires_at,
            last_used_at=now,
            revoked_at=None,
            revoke_reason=None,
            ip_address=ip_address,
            user_agent=user_agent,
            is_active=True,
        )

        db.add(session)

        await db.flush()

        # Session ID now exists; bind the access JWT to this session.
        access_token = create_access_token(
            user_id=user.id,
            session_id=session.id,
        )

        user.last_login_at = now

    # Reload the user while the session is still open so response
    # serialization below performs no lazy IO (sync attribute access
    # in async context would raise MissingGreenlet).
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
