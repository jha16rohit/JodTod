"""
JodTod Authentication - Email OTP Login Service.

Responsibilities:
    - Issue login OTP codes for email addresses that already have an account
    - Verify a login code and open a normal JodTod device session

Important:
    - No account is ever created here; login owns authentication.
    - Raw codes are never stored; only hashes (see otp_service).
    - Uses the existing OTP infrastructure and SMTP provider.
    - Follows the same pattern as phone_auth_service.py for email.
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
from backend.services.otp_service import request_otp, verify_otp_code
from backend.services.session_service import SessionService
from backend.services.user_service import UserService


async def request_email_login_otp(
    db: AsyncSession,
    email: str,
) -> OTPDispatch:
    """
    Issue a email-login OTP for an existing account.

    Raises errors if no account uses the email or the account may not authenticate.
    """
    normalized = (email or "").strip().lower()
    if not normalized:
        raise ValueError("Email is required.")

    async with transaction(db):
        user = await UserService.get_by_email(db, normalized)
        if user is None:
            raise ValueError("No account uses this email.")
        _ensure_may_authenticate(user)
        user_id = user.id

    return await request_otp(
        db,
        destination=normalized,
        purpose=OTPPurpose.EMAIL_LOGIN,
        user_id=user_id,
        subject="Your JodTod login code",
    )


async def verify_email_login_otp(
    db: AsyncSession,
    email: str,
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
    Verify a email-login code and open an authenticated session.

    Returns the standard AuthResponse (same shape as password login).
    """
    normalized = (email or "").strip().lower()
    resolved_device = (device_id or "").strip()
    if not normalized or not resolved_device:
        raise ValueError("Invalid credentials.")

    await verify_otp_code(
        db,
        destination=normalized,
        purpose=OTPPurpose.EMAIL_LOGIN,
        code=code,
    )

    async with transaction(db):
        user = await UserService.get_by_email(db, normalized)
        if user is None:
            raise ValueError("No account uses this email.")
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


def _ensure_may_authenticate(user: User) -> None:
    if not user.is_active:
        raise ValueError("Invalid credentials.")

    if user.deleted_at is not None:
        raise ValueError("Invalid credentials.")

    if user.account_status in (
        AccountStatus.SUSPENDED,
        AccountStatus.DISABLED,
        AccountStatus.DELETED,
    ):
        raise ValueError("Invalid credentials.")

    if user.password_hash is None:
        raise ValueError("Invalid credentials.")