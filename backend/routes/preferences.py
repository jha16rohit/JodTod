"""
JodTod preferences routes: static preferences + notification counts.

All routes require authentication; identity always comes from the
Bearer session, never from client input.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User
from backend.schemas.preferences import (
    NotificationCountsResponse,
    PreferencesResponse,
    UpdatePreferencesRequest,
)
from backend.services.preferences_service import PreferencesService

router = APIRouter(
    prefix="/users",
    tags=["Preferences"],
)


@router.get(
    "/me/preferences",
    response_model=PreferencesResponse,
)
async def read_preferences(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> PreferencesResponse:
    """
    Return the authenticated user's static preferences.

    A missing preference row is materialized with safe defaults, so
    every field is always present and the mobile client never sees
    null preference values.
    """
    prefs = await PreferencesService.get_or_create(db, identity.id)
    return PreferencesResponse.model_validate(prefs)


@router.patch(
    "/me/preferences",
    response_model=PreferencesResponse,
)
async def update_preferences(
    payload: UpdatePreferencesRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> PreferencesResponse:
    """
    Partially update the authenticated user's static preferences.

    Only supplied fields change; omitted fields keep their stored
    values. Values outside the allowlists are rejected (422 from
    request validation, 400 from the service layer) without
    touching the stored row.
    """
    try:
        prefs = await PreferencesService.update_preferences(
            db,
            identity.id,
            currency=payload.currency,
            date_format=payload.date_format,
            start_of_week=payload.start_of_week,
            app_language=payload.app_language,
            display_name=payload.display_name,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    await db.refresh(prefs)
    return PreferencesResponse.model_validate(prefs)


@router.get(
    "/me/notifications/counts",
    response_model=NotificationCountsResponse,
)
async def read_notification_counts(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> NotificationCountsResponse:
    """
    Dynamic notification counts derived from the authenticated
    user's real activity rows. Always numbers, never null.
    """
    counts = await PreferencesService.get_notification_counts(
        db, identity.id
    )
    return NotificationCountsResponse.model_validate(counts)
