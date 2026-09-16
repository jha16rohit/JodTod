"""
JodTod Authentication - Phone OTP login Service.

Responsibilities:
    - Issue login OTP codes for phone numbers that already have an
      account (unknown numbers get a safe 404, which also prevents
      SMS pumping to arbitrary numbers).
    - Verify a login code and open a normal JodTod device session
      (same session/token architecture as password login).

Important:
    - No account is ever created here; signup owns creation.
    - Raw codes are never stored; only hashes (see otp_service).
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.core.jwt import create_access_token
from backend.database import transaction
from backend.models.otp import OTPPurpose
from backend.models.user import AccountStatus, User
from backend.schemas.auth import AuthResponse, TokenResponse
from backend.schemas.user import AuthenticatedUser, with_provider_flags
from backend.services.otp_service import (
    OTPDispatch,
    OTPError,
    request_otp,
    verify_otp_code,
)
from backend.services.session_service import SessionService
from backend.services.user_service import UserService


# ++++++++++++++++ EXCEPTIONS ++++++++++++++++
class PhoneAuthError(OTPError):
    """Base class for phone-login failures."""

    code = "PHONE_AUTH_ERROR"


class PhoneAccountNotFoundError(PhoneAuthError):
    """No account uses this phone number."""

    code = "PHONE_ACCOUNT_NOT_FOUND"
    status_code = 404


class PhoneAccountBlockedError(PhoneAuthError):
    """Account exists but may not authenticate; generic message."""

    code = "INVALID_CREDENTIALS"
    status_code = 401


async def verify_phone_number(
    db: AsyncSession,
    phone: str,
    code: str,
) -> bool:
    """Validate a phone-verification OTP and persist its verified state."""
    normalized = (phone or "").strip()
    await verify_otp_code(
        db,
        destination=normalized,
        purpose=OTPPurpose.PHONE_VERIFICATION,
        code=code,
    )

    async with transaction(db):
        user = await UserService.get_by_phone(db, normalized)
        if user is None:
            raise PhoneAccountNotFoundError("No account uses this number.")
        user.phone_verified = True
        if user.account_status == AccountStatus.PENDING:
            user.account_status = AccountStatus.ACTIVE
    return True


def _ensure_may_authenticate(user: User) -> None:
    if not user.is_active or user.deleted_at is not None:
        raise PhoneAccountBlockedError("Invalid credentials.")
    if user.account_status in (
        AccountStatus.SUSPENDED,
        AccountStatus.DISABLED,
        AccountStatus.DELETED,
    ):
        raise PhoneAccountBlockedError("Invalid credentials.")


# ++++++++++++++++ REQUEST ++++++++++++++++
async def request_login_otp(
    db: AsyncSession,
    phone: str,
) -> OTPDispatch:
    """
    Issue a phone-login OTP for an existing account.

    Raises PhoneAccountNotFoundError when no account uses the number.
    """
    normalized = (phone or "").strip()
    if not normalized:
        raise PhoneAccountNotFoundError("No account uses this number.")

    async with transaction(db):
        user = await UserService.get_by_phone(db, normalized)
        if user is None:
            raise PhoneAccountNotFoundError(
                "No account uses this number."
            )
        _ensure_may_authenticate(user)
        user_id = user.id

    return await request_otp(
        db,
        destination=normalized,
        purpose=OTPPurpose.PHONE_LOGIN,
        user_id=user_id,
        subject="Your JodTod login code",
    )


# ++++++++++++++++ VERIFY + LOGIN ++++++++++++++++
async def verify_login_otp(
    db: AsyncSession,
    phone: str,
    code: str,
    *,
    device_id: str,
    device_name: str | None = None,
    platform: str | None = None,
    app_version: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuthResponse:
    """
    Verify a phone-login code and open an authenticated session.

    Returns the standard AuthResponse (same shape as password login).
    """
    normalized = (phone or "").strip()
    resolved_device = (device_id or "").strip()
    if not normalized or not resolved_device:
        raise PhoneAccountBlockedError("Invalid credentials.")

    await verify_otp_code(
        db,
        destination=normalized,
        purpose=OTPPurpose.PHONE_LOGIN,
        code=code,
    )

    async with transaction(db):
        user = await UserService.get_by_phone(db, normalized)
        if user is None:
            raise PhoneAccountBlockedError("Invalid credentials.")
        _ensure_may_authenticate(user)

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
