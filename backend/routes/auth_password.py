from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.auth import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
)
from backend.services.password_reset_service import (
    forgot_password,
    reset_password,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
)
async def forgot_password_route(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Request a password-reset code by email or phone.

    The response is always identical so the endpoint cannot be
    used for account enumeration. Business logic lives in
    password_reset_service.py.
    """
    await forgot_password(db, payload.identifier)

    return MessageResponse(
        message=(
            "If an account exists for this identifier, "
            "a reset code was sent."
        )
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
)
async def reset_password_route(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Set a new password with a valid reset code.

    All existing sessions are revoked. Business logic lives in
    password_reset_service.py.
    """
    await reset_password(
        db,
        payload.identifier,
        payload.code,
        payload.new_password,
    )

    return MessageResponse(
        message="Password updated. Please log in again."
    )
