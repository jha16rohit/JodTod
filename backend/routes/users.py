"""
JodTod user routes: current-user profile and device/session management.

All routes require authentication via dependencies/auth.py.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db, write_transaction
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
from backend.schemas.profile import (
    AccountStatusInfo,
    ProfileDashboardResponse,
    ProfilePhotoResponse,
    UpdateProfileRequest,
)
from backend.schemas.user import AuthenticatedUser, with_provider_flags
from backend.services.auth_logout_service import (
    SessionNotFoundError,
    logout_session,
)
from backend.services.profile_photo_service import (
    InvalidPhotoError,
    PhotoStorageError,
    PhotoTooLargeError,
    ProfilePhotoService,
)
from backend.services.profile_service import ProfileService
from backend.services.session_service import SessionService
from backend.services.user_service import (
    DuplicateProfileFieldError,
    UserService,
)

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
    "/me/profile",
    response_model=ProfileDashboardResponse,
)
async def read_profile_dashboard(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> ProfileDashboardResponse:
    """
    Aggregated My Profile dashboard for the authenticated user.

    Identity comes from the Bearer session only — no client user_id is
    accepted. Groups/expenses/trips/settlements return empty collections
    until those modules exist; recent_activities is real user-scoped data.
    """
    data = await ProfileService.get_dashboard(
        db, identity.id, user=identity
    )
    profile = with_provider_flags(
        AuthenticatedUser.model_validate(data["profile"]),
        google_subject=data["profile"].google_subject,
        apple_subject=data["profile"].apple_subject,
    )
    return ProfileDashboardResponse(
        profile=profile,
        groups=data["groups"],
        expenses=data["expenses"],
        trips=data["trips"],
        settlements=data["settlements"],
        account_health=AccountStatusInfo.model_validate(
            data["account_health"]
        ),
        recent_activities=data["recent_activities"],
    )


@router.patch(
    "/me",
    response_model=CurrentUserResponse,
)
async def update_current_user(
    payload: UpdateProfileRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> CurrentUserResponse:
    """
    Update the authenticated user's editable profile fields.

    Runs on a fresh session (the identity dependency already consumed
    the cached one). Only the caller's own record is modified; identity
    comes from the Bearer session, never from client input. Email is
    read-only: it is not a request field and is never changed here.

    Commit note: the lookup above autobegins a transaction on this
    fresh session, so transaction() would (by design) refuse to own
    it and the update would silently roll back on session close
    (HTTP 200 with nothing persisted). write_transaction() commits
    the session's current transaction unconditionally — the same
    pattern as PATCH /users/me/preferences.
    """
    user = await UserService.get_by_id(db, identity.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user not found.",
        )
    try:
        async with write_transaction(db):
            await UserService.update_profile(
                db,
                user,
                name=payload.name,
                username=payload.username,
                phone=payload.phone,
            )
    except DuplicateProfileFieldError as exc:
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
    return CurrentUserResponse(
        user=with_provider_flags(
            AuthenticatedUser.model_validate(user),
            google_subject=user.google_subject,
            apple_subject=user.apple_subject,
        )
    )


@router.post(
    "/me/photo",
    response_model=ProfilePhotoResponse,
)
async def upload_profile_photo(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
    photo: UploadFile = File(...),
) -> ProfilePhotoResponse:
    """
    Upload/replace the authenticated user's profile photo.

    Validates MIME type, extension, and size; stores under a
    server-generated name; persists the reference; removes the old file
    only after the new reference commits.
    """
    user = await UserService.get_by_id(db, identity.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user not found.",
        )
    try:
        avatar_url = await ProfilePhotoService.set_profile_photo(
            db, user, photo
        )
    except PhotoTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=exc.message,
        ) from exc
    except InvalidPhotoError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc
    except PhotoStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=exc.message,
        ) from exc
    return ProfilePhotoResponse(user_id=user.id, avatar_url=avatar_url)


@router.delete(
    "/me/photo",
    response_model=ProfilePhotoResponse,
)
async def delete_profile_photo(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> ProfilePhotoResponse:
    """
    Remove the authenticated user's profile photo.

    Clears the database reference and deletes the stored file when
    present. Safe when no photo exists.
    """
    user = await UserService.get_by_id(db, identity.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user not found.",
        )
    await ProfilePhotoService.clear_profile_photo(db, user)
    return ProfilePhotoResponse(user_id=user.id, avatar_url=None)


@router.get(
    "/sessions",
    response_model=SessionListResponse,
)
async def list_sessions(
    identity: Annotated[
        tuple[User, UserSession],
        Depends(get_current_user_and_session),
    ],
    db: AsyncSession = Depends(get_db),
) -> SessionListResponse:
    """
    List the authenticated user's device sessions, newest first.

    Shares the request's single cached session with the identity
    dependency (no second pool checkout on a read). Write routes keep
    their own session so their transaction() still owns the commit.
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
