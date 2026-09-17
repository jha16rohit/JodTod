"""
JodTod Authentication - Login Service

Password login is deliberately split into two steps:

    1) POST /auth/login       validates the identifier + password, then
                              dispatches a login OTP (EMAIL_LOGIN for
                              email accounts, PHONE_LOGIN for phone-only
                              accounts). It returns a LoginStatusResponse
                              with status == "otp_required". No session is
                              created and no tokens are issued.

    2) POST /auth/verify-otp  (purpose EMAIL_LOGIN / PHONE_LOGIN) verifies
                              the code and only then opens the device
                              Session, returning the standard AuthResponse.

This guarantees a password alone can never open a session: OTP
verification is mandatory before any token is issued.

Responsibilities of this module:
    - Normalize the login identifier (email or phone)
    - Look up the corresponding User record
    - Ensure the account is allowed to authenticate
    - Verify the supplied password using backend/core/security.py
    - Dispatch the appropriate login OTP

Important:
    - Plaintext passwords are never persisted or compared manually.
    - All authentication failures return the same generic error so
      callers cannot distinguish "unknown account" from "wrong
      password" (no account enumeration).
    - Session/token creation lives in email_login_otp.py,
      phone_auth_service.py, and auth_signup_service.py via
      SessionService.issue_session.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.core.security import verify_password
from backend.database import transaction
from backend.models.user import AccountStatus, User
from backend.schemas.auth import LoginRequest, LoginStatusResponse
from backend.services.email_login_otp import request_email_login_otp
from backend.services.phone_auth_service import request_login_otp
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


# ++++++++++++++++ LOGIN (STEP 1: CREDENTIALS + OTP DISPATCH) ++++++++++++++++
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
) -> LoginStatusResponse:
    """
    Validate identifier + password and dispatch a login OTP.

    This step never opens a session and never issues tokens; the user
    must finish login by verifying the code at POST /auth/verify-otp
    (purpose EMAIL_LOGIN or PHONE_LOGIN).

    The device_*/ip_* arguments are accepted for call-site symmetry
    with the verify-otp endpoints; they are unused here because no
    session is created in this step.

    Raises:
        InvalidLoginError: For every authentication failure, using a
            generic message that reveals nothing about the account.

    Returns:
        LoginStatusResponse: The pending "otp_required" response,
            describing where the code was sent and with which purpose
            it must be verified. It carries no tokens.
    """

    identifier = (payload.identifier or "").strip()

    if not identifier:
        raise InvalidLoginError("Invalid credentials.")

    if not payload.password:
        raise InvalidLoginError("Invalid credentials.")

    # NOTE: the user lookup runs INSIDE the transaction below. A SELECT
    # autobegins a transaction on the AsyncSession; doing the lookup
    # before transaction(db) would leave the whole step joined to an
    # uncommitted autobegun transaction. The transaction() helper owns
    # the boundary here while request_email_login_otp/request_login_otp
    # participate in it.
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

        # Dispatch the login OTP. Email accounts use EMAIL_LOGIN
        # (SMTP); phone-only accounts fall back to PHONE_LOGIN.
        if (user.email or "").strip():
            await request_email_login_otp(db, email=user.email)
            destination = (user.email or "").strip().lower()
            purpose = "email_login"
            message = (
                "A verification code was sent to your email. "
                "Enter the code to finish signing in."
            )
        else:
            await request_login_otp(db, phone=user.phone)
            destination = (user.phone or "").strip()
            purpose = "phone_login"
            message = (
                "A verification code was sent to your phone. "
                "Enter the code to finish signing in."
            )

    return LoginStatusResponse(
        status="otp_required",
        message=message,
        destination=destination,
        purpose=purpose,
        expires_in=settings.otp_expire_seconds,
    )