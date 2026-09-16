from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.auth import AuthResponse, LoginRequest
from backend.services.auth_login_service import login_with_password

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=AuthResponse,
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Authenticate a user with an identifier (email or phone) and password.

    Responsibilities:
    - Accept validated login data.
    - Delegate authentication to the login service.
    - Return the authenticated session response.

    Business logic must remain in auth_login_service.py.
    """
    return await login_with_password(
        db=db,
        payload=payload,
        device_id=payload.device_id,
    )
