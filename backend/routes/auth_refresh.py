from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.auth import RefreshTokenRequest, TokenResponse
from backend.services.auth_refresh_service import refresh_tokens

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
async def refresh(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Rotate a refresh token and issue a new token pair.

    Rotation reuse revokes the whole token family. Business logic
    lives in auth_refresh_service.py.
    """
    return await refresh_tokens(
        db,
        payload.refresh_token,
        session_id=payload.session_id,
    )
