"""
JodTod activity routes: user-scoped activity feed.

All routes require authentication via dependencies/auth.py.
"""

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User
from backend.schemas.activity import (
    ActivityCreate,
    ActivityListResponse,
    ActivityResponse,
)
from backend.services.activity_service import (
    ActivityService,
    InvalidActivityFilterError,
)

router = APIRouter(
    prefix="/activities",
    tags=["Activities"],
)


@router.get(
    "",
    response_model=ActivityListResponse,
)
async def list_activities(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
    type: Annotated[
        Literal["all", "expense", "settlement", "member", "group"],
        Query(description="Activity type filter"),
    ] = "all",
    member: Annotated[
        list[str],
        Query(
            description="Member keys (repeatable); omit or pass "
            '"all" for all members'
        ),
    ] = ["all"],
    group: Annotated[
        list[str],
        Query(
            description="Group names (repeatable); omit or pass "
            '"all" for all groups'
        ),
    ] = ["all"],
    date_range: Annotated[
        Literal["all", "today", "week", "month", "custom"],
        Query(description="UTC date window filter"),
    ] = "all",
    start_date: Annotated[
        str | None,
        Query(description="Custom range start (YYYY-MM-DD, inclusive)"),
    ] = None,
    end_date: Annotated[
        str | None,
        Query(description="Custom range end (YYYY-MM-DD, inclusive)"),
    ] = None,
    q: Annotated[
        str | None,
        Query(
            description="Case-insensitive partial search across "
            "title, description, member and group"
        ),
    ] = None,
) -> ActivityListResponse:
    """
    List the authenticated user's activities, newest first.

    Powers the mobile Activity quick tabs (All / Expenses /
    Settlements / Members), the search field, and the Filter
    Activity sheet selections (type, date range incl. custom range,
    member, group).
    """
    try:
        activities = await ActivityService.list_activities(
            db,
            user.id,
            type_filter=type,
            member=member,
            group=group,
            date_range=date_range,
            start_date=start_date,
            end_date=end_date,
            search=q,
        )
    except InvalidActivityFilterError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return ActivityListResponse(
        items=[ActivityResponse.model_validate(a) for a in activities]
    )


@router.get(
    "/{activity_id}",
    response_model=ActivityResponse,
)
async def get_activity(
    activity_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> ActivityResponse:
    """
    Return one activity owned by the authenticated user.

    Powers the mobile Activity detail screens (expense, settlement,
    member event, group update). Unknown IDs and other users'
    records both yield 404.
    """
    activity = await ActivityService.get_activity(db, user.id, activity_id)
    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found.",
        )
    return ActivityResponse.model_validate(activity)


@router.post(
    "",
    response_model=ActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_activity(
    payload: ActivityCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> ActivityResponse:
    """
    Record one activity event for the authenticated user.

    Used by expense / settlement / member / group flows (and tests)
    to append to the user's activity feed.
    """
    activity = await ActivityService.create_activity(
        db,
        user.id,
        payload,
    )
    return ActivityResponse.model_validate(activity)
