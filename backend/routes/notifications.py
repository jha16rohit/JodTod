"""
JodTod notification routes: user-scoped notification feed.

All routes require authentication via dependencies/auth.py.
Identity always comes from the Bearer session, never from client input.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User
from backend.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    MarkNotificationReadRequest,
    UnreadCountResponse,
)
from backend.services.notification_service import NotificationService

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=NotificationListResponse,
)
async def list_notifications(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    type: Annotated[
        str | None,
        Query(description="Notification type filter (expense_added, settlement_completed, group_invitation, group_comment, trip_report_ready, budget_alert, member_joined_group, bill_image_updated, group_settings_updated, system)"),
    ] = None,
    read: Annotated[
        str | None,
        Query(description="Filter by read status: unread, read, all"),
    ] = None,
    limit: Annotated[
        int | None,
        Query(ge=1, le=200, description="Max rows to return"),
    ] = None,
    offset: Annotated[
        int,
        Query(ge=0, description="Rows to skip, for load-more paging"),
    ] = 0,
) -> NotificationListResponse:
    """
    List the authenticated user's notifications, newest first.

    Powers the Notifications screen list with date grouping,
    filter chips, and unread/read separation.
    """
    type_enum = None
    if type is not None:
        from backend.models.notification import NotificationType
        try:
            type_enum = NotificationType(type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported notification type: {type}",
            )

    result = await NotificationService.list_notifications(
        db=db,
        recipient_user_id=user.id,
        type_filter=type_enum,
        read_filter=read,
        limit=limit,
        offset=offset,
    )
    return result


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
)
async def get_notification(
    notification_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    """
    Return one notification owned by the authenticated user.

    Unknown IDs and other users' records both yield 404.
    """
    notif_id = UUID(notification_id)
    result = await NotificationService.get_notification(
        db=db,
        recipient_user_id=user.id,
        notification_id=notif_id,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    return result


@router.post(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
)
async def mark_notification_as_read(
    notification_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
    payload: MarkNotificationReadRequest = ...,  # will use body
) -> NotificationResponse:
    """
    Mark a single notification as read.

    Returns the updated notification so the UI can immediately
    reflect the new read-state.
    """
    notif_id = UUID(notification_id)
    # Extract notification_id from payload or path
    service_result = await NotificationService.mark_as_read(
        db=db,
        recipient_user_id=user.id,
        notification_id=notif_id,
    )
    from backend.schemas.notification import NotificationResponse
    return NotificationResponse.model_validate(service_result)


@router.get(
    "/unread/count",
    response_model=UnreadCountResponse,
)
async def get_unread_count(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> UnreadCountResponse:
    """
    Return the authenticated user's unread notification count.

    This is the authoritative source for the badge/count displayed
    elsewhere in the app (tab bar, toolbar, etc.).
    """
    count = await NotificationService.get_unread_count(
        db=db,
        recipient_user_id=user.id,
    )
    return UnreadCountResponse(unread_count=count)