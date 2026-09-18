"""
JodTod Authentication - Password recovery Service (6-digit OTP).

Flow:
    forgot-password {identifier}
        -> always the same generic success response (no account
           disclosure); a code is dispatched only when an account
           with that email/phone actually exists.
    reset-password {identifier, code, new_password}
        -> verify the single-use code, Argon2id-hash the new
           password, revoke every session of the user.

Important:
    - Recovery uses OTP records (purpose PASSWORD_RESET, channel
      inferred from the identifier), never a separate token system.
    - Forgot responses never echo a dev code, even in development.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.core.security import hash_password
from backend.database import transaction
from backend.models.otp import OTPPurpose
from backend.services.otp_service import (
    OTPError,
    request_otp,
    verify_otp_code,
)
from backend.services.session_service import SessionService
from backend.services.user_service import UserService


# ++++++++++++++++ EXCEPTIONS ++++++++++++++++
class PasswordResetError(OTPError):
    code = "PASSWORD_RESET_ERROR"


class InvalidResetCodeError(PasswordResetError):
    code = "INVALID_RESET_CODE"


# ++++++++++++++++ FORGOT ++++++++++++++++
async def forgot_password(
    db: AsyncSession,
    identifier: str,
) -> None:
    """
    Dispatch a reset code when an account matches; always succeed.

    The caller returns the same generic message either way so the
    endpoint cannot be used for account enumeration.
    """
    normalized = (identifier or "").strip()
    if not normalized:
        return

    async with transaction(db):
        user = await UserService.get_by_identifier(db, normalized)
        if user is None:
            return
        user_id = user.id

    try:
        dispatch = await request_otp(
            db,
            destination=normalized,
            purpose=OTPPurpose.PASSWORD_RESET,
            user_id=user_id,
            subject="Reset your JodTod password",
        )
        # Never surface dev codes on this endpoint.
        dispatch.dev_code = None
    except OTPError:
        # Cooldown/rate-limit/provider issues stay silent here to
        # preserve the non-disclosure contract.
        return


# ++++++++++++++++ RESET ++++++++++++++++
async def reset_password(
    db: AsyncSession,
    identifier: str,
    code: str,
    new_password: str,
) -> None:
    """
    Verify the reset code and set a new password.

    All existing sessions are revoked, forcing re-authentication on
    every device with the new credential.
    """
    normalized = (identifier or "").strip()
    if not normalized:
        raise InvalidResetCodeError("Invalid or expired code.")

    if not new_password or not (
        settings.password_min_length
        <= len(new_password)
        <= settings.password_max_length
    ):
        raise PasswordResetError(
            f"Password must be {settings.password_min_length}-"
            f"{settings.password_max_length} characters."
        )

    try:
        await verify_otp_code(
            db,
            destination=normalized,
            purpose=OTPPurpose.PASSWORD_RESET,
            code=code,
        )
    except OTPError as exc:
        raise InvalidResetCodeError("Invalid or expired code.") from exc

    async with transaction(db):
        user = await UserService.get_by_identifier(db, normalized)
        if user is None:
            raise InvalidResetCodeError("Invalid or expired code.")
        user.password_hash = hash_password(new_password)
        await SessionService.revoke_all_user_sessions(
            db,
            user.id,
            reason=SessionService.REASON_PASSWORD_RESET,
        )
