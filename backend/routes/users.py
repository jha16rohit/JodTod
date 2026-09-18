"""
JodTod user routes: current-user profile and device/session management.

All routes require authentication via dependencies/auth.py.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import (
    get_current_session,
    get_current_user,
    get_current_user_and_session,
)
from backend.models.session import Session as UserSession
from backend.models.user import User
from backend.schemas.auth import (
    CurrentUserResponse,
    MessageResponse,
    SessionInfo,
    SessionListResponse,
)
from backend.schemas.user import AuthenticatedUser, with_provider_flags
from backend.services.auth_logout_service import (
    SessionNotFoundError,
    logout_session,
)
from backend.services.session_service import SessionService

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
async def read_current_user(
    user: Annotated[User, Depends(get_current_user)],
) -> CurrentUserResponse:
    """
    Return the authenticated user's profile.

    Used by the mobile client for session revalidation on launch
    and reconnect (see auth.service restoreSession).
    """
    return CurrentUserResponse(
        user=with_provider_flags(
            AuthenticatedUser.model_validate(user),
            google_subject=user.google_subject,
            apple_subject=user.apple_subject,
        )
    )


@router.get(
    "/sessions",
    response_model=SessionListResponse,
)
async def list_sessions(
    identity: Annotated[
        tuple[User, UserSession],
        Depends(get_current_user_and_session),
    ],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> SessionListResponse:
    """
    List the authenticated user's device sessions, newest first.

    NOTE: own session (use_cache=False). The identity dependency
    already consumed the cached get_db session (its SELECT
    autobegins a transaction), so listing on that same session
    would entangle this read with it.
    """
    user, current = identity
    sessions = await SessionService.list_user_sessions(db, user.id)

    return SessionListResponse(
        sessions=[
            SessionInfo(
                id=s.id,
                device_id=s.device_id,
                device_name=s.device_name,
                platform=s.platform,
                app_version=s.app_version,
                expires_at=s.expires_at,
                last_used_at=s.last_used_at,
                is_active=s.is_active,
                revoked_at=s.revoked_at,
                created_at=s.created_at,
                current=(s.id == current.id),
            )
            for s in sessions
        ]
    )


@router.post(
    "/sessions/{session_id}/revoke",
    response_model=MessageResponse,
)
async def revoke_session(
    session_id: UUID,
    session: Annotated[UserSession, Depends(get_current_session)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> MessageResponse:
    """
    Revoke one of the authenticated user's sessions (a device).

    Revoking the current session is allowed; the client then drops
    local credentials like a logout. Reuses the logout revocation
    path so behavior stays identical.
    """
    try:
        await logout_session(
            db=db,
            user_id=session.user_id,
            session_id=session_id,
            reason="device_revoked",
        )
    except SessionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        ) from exc

    return MessageResponse(message="Session revoked.")
