from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.otp import OTPPurpose
from backend.schemas.auth import (
    AuthResponse,
    OTPResponse,
    SendOTPRequest,
    VerifyOTPRequest,
)
from backend.services.otp_service import request_otp, verify_otp_code
from backend.services.phone_auth_service import (
    PhoneAccountBlockedError,
    request_login_otp,
    verify_login_otp,
    verify_phone_number,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/send-otp",
    response_model=OTPResponse,
)
async def send_otp(
    payload: SendOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> OTPResponse:
    """
    Issue a one-time code for a destination + purpose.

    Phone-login codes require an existing account; all other
    purposes dispatch to any well-formed destination. Business
    logic lives in otp_service.py / phone_auth_service.py.
    """
    if payload.purpose == OTPPurpose.PHONE_LOGIN:
        dispatch = await request_login_otp(db, payload.destination)
    else:
        dispatch = await request_otp(
            db,
            destination=payload.destination,
            purpose=payload.purpose,
        )

    message = (
        "Code dispatch was accepted by the provider."
        if dispatch.provider_accepted
        else "Code generated, but no real SMS/email delivery provider is configured."
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
    "/verify-otp",
    response_model=AuthResponse | OTPResponse,
)
async def verify_otp(
    payload: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse | OTPResponse:
    """
    Verify a one-time code.

    Purpose PHONE_LOGIN opens a full authenticated session and
    returns AuthResponse; every other purpose returns OTPResponse.
    """
    if payload.purpose == OTPPurpose.PHONE_LOGIN:
        device_id = (payload.device_id or "").strip()
        if not device_id:
            # Reuse the phone service's generic failure so device
            # problems are indistinguishable from bad codes.
            raise PhoneAccountBlockedError("Invalid credentials.")
        return await verify_login_otp(
            db,
            payload.destination,
            payload.otp,
            device_id=device_id,
            device_name=payload.device_name,
            platform=payload.platform,
            app_version=payload.app_version,
        )

    if payload.purpose == OTPPurpose.PHONE_VERIFICATION:
        await verify_phone_number(db, payload.destination, payload.otp)
    else:
        await verify_otp_code(
            db,
            destination=payload.destination,
            purpose=payload.purpose,
            code=payload.otp,
        )
    return OTPResponse(
        message="Code verified.",
        verified=True,
    )
