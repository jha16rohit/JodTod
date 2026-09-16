from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.auth import (
    EmailVerificationResponse,
    OTPResponse,
    SendEmailVerificationRequest,
    VerifyEmailCodeRequest,
)
from backend.services.email_verification_service import (
    send_verification_email,
    verify_email_code,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/send-email-verification",
    response_model=OTPResponse,
)
async def send_email_verification(
    payload: SendEmailVerificationRequest,
    db: AsyncSession = Depends(get_db),
) -> OTPResponse:
    """
    Issue a 6-digit email verification code.

    Business logic lives in email_verification_service.py.
    """
    dispatch = await send_verification_email(db, payload.email)

    message = (
        "Verification-code dispatch was accepted by the email provider."
        if dispatch.provider_accepted
        else "Verification code generated, but no real email delivery provider is configured."
    )
    return OTPResponse(
        message=message,
        expires_at=dispatch.expires_at,
        retry_after_seconds=None,
        verified=False,
        provider=dispatch.provider,
        provider_accepted=dispatch.provider_accepted,
        delivery_status=dispatch.delivery_status,
        dev_code=dispatch.dev_code,
    )


@router.post(
    "/verify-email",
    response_model=EmailVerificationResponse,
)
async def verify_email(
    payload: VerifyEmailCodeRequest,
    db: AsyncSession = Depends(get_db),
) -> EmailVerificationResponse:
    """
    Verify an email address with its 6-digit code.

    Path preserved from the original contract; the body carries
    {email, code} because a bare code cannot safely resolve an
    account. Business logic lives in email_verification_service.py.
    """
    verified = await verify_email_code(
        db,
        payload.email,
        payload.code,
    )

    return EmailVerificationResponse(
        message="Email verified.",
        verified=verified,
    )
