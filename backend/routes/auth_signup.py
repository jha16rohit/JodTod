from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.auth import SignupRequest, AuthResponse
from backend.services.auth_signup_service import create_account

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup(
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Create a new user account.

    Responsibilities:
    - Accept validated signup data.
    - Delegate account creation to the signup service.
    - Return the authenticated session response.

    Business logic must remain in auth_signup_service.py.
    """
    return await create_account(
        db=db,
        payload=payload,
        device_id=payload.device_id,
        device_name=payload.device_name,
        platform=payload.platform,
        app_version=payload.app_version,
    )