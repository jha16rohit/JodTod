from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.auth import LoginRequest, LoginStatusResponse
from backend.services.auth_login_service import login_with_password

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=LoginStatusResponse,
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginStatusResponse:
    """
    Step 1 of the two-step password login.

    Validates the identifier (email or phone) + password and dispatches
    a login OTP (EMAIL_LOGIN via SMTP, or PHONE_LOGIN for phone-only
    accounts). Returns a LoginStatusResponse with status "otp_required".
    No session is created and no tokens are issued here.

    The client must complete login at POST /auth/verify-otp with the
    returned destination + purpose, which then opens the session.

    Business logic must remain in auth_login_service.py.
    """
    return await login_with_password(
        db=db,
        payload=payload,
        device_id=payload.device_id,
    )
