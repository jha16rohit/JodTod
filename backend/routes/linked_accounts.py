"""
JodTod linked-accounts routes for the authenticated user.

Identity always comes from the Bearer session, never from client
input. Provider identities are verified server-side with the same
ID-token verification as OAuth login (auth_oauth_service): the
mobile client only ever sends the provider ID token, never a
self-asserted email/subject.
"""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db, transaction
from backend.dependencies.auth import get_current_user
from backend.models.user import User
from backend.schemas.linked_accounts import (
    LinkedAccountsResponse,
    LinkProviderRequest,
)
from backend.services.auth_oauth_service import (
    InvalidOAuthTokenError,
    OAuthConflictError,
    OAuthError,
    OAuthNotConfiguredError,
    verify_apple_identity_token,
    verify_google_id_token,
)
from backend.services.provider_link_service import ProviderLinkService
from backend.services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["Linked Accounts"],
)

RouteProvider = Literal["google", "apple"]


def _verify(provider: RouteProvider, id_token: str) -> dict:
    if provider == "google":
        return verify_google_id_token(id_token)
    return verify_apple_identity_token(id_token)


@router.get(
    "/me/linked-accounts",
    response_model=LinkedAccountsResponse,
)
async def read_linked_accounts(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> LinkedAccountsResponse:
    """
    Real connection state for the Linked Accounts screen, derived
    from the authenticated user's own record. Safe metadata only.

    `identity` is already the loaded, session-valid User, so no second
    lookup of the same row is performed.
    """
    return LinkedAccountsResponse.model_validate(
        ProviderLinkService.linked_state(identity)
    )


@router.post(
    "/me/linked-accounts/{provider}/link",
    response_model=LinkedAccountsResponse,
)
async def link_provider_account(
    provider: RouteProvider,
    payload: LinkProviderRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> LinkedAccountsResponse:
    """
    Link a verified provider identity to the CURRENT user.

    The ID token is verified server-side; linking never creates a
    user and never replaces the session. A subject already owned by
    another user yields 409 without touching either account.
    """
    if provider not in ("google", "apple"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider linking is not supported.",
        )
    try:
        claims = _verify(provider, payload.id_token)
    except OAuthNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except (InvalidOAuthTokenError, OAuthError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Provider verification failed.",
        ) from exc

    user = await UserService.get_by_id(db, identity.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user not found.",
        )
    try:
        async with transaction(db):
            await ProviderLinkService.link_provider(
                db, user, provider, claims
            )
    except OAuthConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    await db.refresh(user)
    return LinkedAccountsResponse.model_validate(
        ProviderLinkService.linked_state(user)
    )


@router.delete(
    "/me/linked-accounts/{provider}/unlink",
    response_model=LinkedAccountsResponse,
)
async def unlink_provider_account(
    provider: RouteProvider,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> LinkedAccountsResponse:
    """
    Detach a provider identity from the CURRENT user.

    Refuses with 400 when this is the last remaining sign-in method
    (the user can never lock themselves out). Canonical email/phone
    are never modified.
    """
    if provider not in ("google", "apple"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider linking is not supported.",
        )
    user = await UserService.get_by_id(db, identity.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user not found.",
        )
    try:
        async with transaction(db):
            await ProviderLinkService.unlink_provider(db, user, provider)
    except OAuthConflictError as exc:
        # Last remaining sign-in method (LAST_AUTH_METHOD).
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    await db.refresh(user)
    return LinkedAccountsResponse.model_validate(
        ProviderLinkService.linked_state(user)
    )
