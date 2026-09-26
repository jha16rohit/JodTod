from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import get_current_session
from backend.models.session import Session as UserSession
from backend.schemas.auth import LogoutRequest, MessageResponse
from backend.services.auth_logout_service import logout_session

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/logout",
    response_model=MessageResponse,
)
async def logout(
    session: Annotated[UserSession, Depends(get_current_session)],
    # NOTE: use_cache=False gives this route its own AsyncSession.
    # get_current_session already consumes the cached get_db session
    # (its SELECT autobegins a transaction on it), so reusing that
    # same session here would make transaction() fail with
    # "A transaction is already begun on this Session".
    db: AsyncSession = Depends(get_db, use_cache=False),
    payload: LogoutRequest | None = None,
) -> MessageResponse:
    """
    Log out an authenticated session.

    By default the session bound to the access token is revoked. An
    explicit session_id may be supplied to revoke a different session
    owned by the same user.

    Responsibilities:
    - Identify the authenticated user/session via the auth dependency.
    - Delegate revocation to the logout service.
    - Return a generic confirmation.

    Business logic must remain in auth_logout_service.py.
    """
    target_session_id: UUID = session.id

    if payload is not None and payload.session_id is not None:
        target_session_id = payload.session_id

    await logout_session(
        db=db,
        user_id=session.user_id,
        session_id=target_session_id,
    )

    return MessageResponse(message="Logged out.")
