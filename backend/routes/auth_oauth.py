from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.auth import AuthResponse, OAuthRequest
from backend.services.auth_oauth_service import (
    authenticate_with_provider,
    verify_apple_identity_token,
    verify_google_id_token,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


async def _authenticate(
    db: AsyncSession,
    provider: Literal["google", "apple"],
    payload: OAuthRequest,
) -> AuthResponse:
    if provider == "google":
        claims = verify_google_id_token(payload.id_token)
    else:
        claims = verify_apple_identity_token(payload.id_token)

    return await authenticate_with_provider(
        db,
        provider,
        claims,
        device_id=payload.device_id or "",
        device_name=payload.device_name,
        platform=payload.platform,
        app_version=payload.app_version,
    )


@router.post(
    "/google",
    response_model=AuthResponse,
)
async def google_auth(
    payload: OAuthRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Sign up or log in with a Google ID token.

    The token is verified server-side (issuer, audience, expiry,
    subject, signature); account linking follows the safe policy
    in auth_oauth_service.py. Returns a normal JodTod session.
    """
    return await _authenticate(db, "google", payload)


@router.post(
    "/apple",
    response_model=AuthResponse,
)
async def apple_auth(
    payload: OAuthRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Sign up or log in with an Apple identity token.

    Same architecture and linking policy as Google. Requires the
    team-supplied Apple configuration (APPLE_CLIENT_ID et al.);
    without it the endpoint fails closed with 503.
    """
    return await _authenticate(db, "apple", payload)
