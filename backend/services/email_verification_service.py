"""
JodTod Authentication - Email verification Service (6-digit OTP).

Responsibilities:
    - Send a 6-digit verification code through the configured email
      provider (mock in development, Resend when configured).
    - Verify the code and flip email_verified (+ PENDING -> ACTIVE).
    - Best-effort post-signup dispatch that never fails signup.

Important:
    - Email verification uses OTP records (purpose EMAIL_VERIFICATION),
      never the password-reset token mechanism.
    - Codes are hashed; attempt limits, expiry, cooldown, and
      single-use are enforced by otp_service.
"""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import transaction
from backend.models.otp import OTPPurpose
from backend.models.user import AccountStatus
from backend.services.otp_service import (
    OTPDispatch,
    OTPError,
    request_otp,
    verify_otp_code,
)
from backend.services.user_service import UserService


logger = logging.getLogger(__name__)


# ++++++++++++++++ EXCEPTIONS ++++++++++++++++
class EmailVerificationError(OTPError):
    code = "EMAIL_VERIFICATION_ERROR"


class EmailAccountNotFoundError(EmailVerificationError):
    code = "EMAIL_ACCOUNT_NOT_FOUND"
    status_code = 404


# ++++++++++++++++ SEND ++++++++++++++++
async def send_verification_email(
    db: AsyncSession,
    email: str,
) -> OTPDispatch:
    """
    Issue an email-verification code for an existing account.

    Raises EmailAccountNotFoundError when no account uses the email
    (prevents verification-mail bombing of arbitrary addresses).
    """
    normalized = (email or "").strip().lower()
    if not normalized:
        raise EmailAccountNotFoundError("No account uses this email.")

    async with transaction(db):
        user = await UserService.get_by_email(db, normalized)
        if user is None:
            raise EmailAccountNotFoundError(
                "No account uses this email."
            )
        user_id = user.id

    return await request_otp(
        db,
        destination=normalized,
        purpose=OTPPurpose.EMAIL_VERIFICATION,
        user_id=user_id,
        subject="JodTod Email Verification Code",
    )


# ++++++++++++++++ VERIFY ++++++++++++++++
async def verify_email_code(
    db: AsyncSession,
    email: str,
    code: str,
) -> bool:
    """
    Verify an email code; mark the address verified.

    A freshly verified PENDING account becomes ACTIVE so
    verification carries account meaning without breaking login
    (password login already permits PENDING accounts).
    Returns True when the address is (now) verified.
    """
    normalized = (email or "").strip().lower()

    await verify_otp_code(
        db,
        destination=normalized,
        purpose=OTPPurpose.EMAIL_VERIFICATION,
        code=code,
    )

    async with transaction(db):
        user = await UserService.get_by_email(db, normalized)
        if user is None:
            # Code was valid but the account vanished concurrently;
            # verification cannot attach to anything.
            raise EmailAccountNotFoundError(
                "No account uses this email."
            )
        user.email_verified = True
        if user.account_status == AccountStatus.PENDING:
            user.account_status = AccountStatus.ACTIVE

    return True


# ++++++++++++++++ POST-SIGNUP HOOK ++++++++++++++++
async def send_signup_verification_best_effort(
    db: AsyncSession,
    *,
    email: str | None,
    phone: str | None,
) -> None:
    """
    Fire-and-forget verification dispatch after signup.

    Signup keeps its immediate-session contract; verification runs
    alongside it. Delivery/provider failures are logged and swallowed
    so signup can never fail because a code could not be sent.
    """
    try:
        if email:
            await send_verification_email(db, email)
        elif phone:
            await request_otp(
                db,
                destination=phone,
                purpose=OTPPurpose.PHONE_VERIFICATION,
                subject="Verify your JodTod number",
            )
    except Exception as exc:  # noqa: BLE001 - best effort by contract
        logger.warning(
            "Post-signup verification dispatch failed: %s: %s",
            type(exc).__name__,
            exc,
        )
