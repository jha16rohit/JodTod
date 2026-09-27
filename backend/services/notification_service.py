# backend/services/notification_service.py

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.activity import Activity, ActivityType
from backend.models.notification import Notification, NotificationType
from backend.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    MarkNotificationReadRequest,
    UnreadCountResponse,
)
from backend.database import transaction


class NotificationService:
    """User-scoped notification persistence and event wiring."""

    @staticmethod
    def utc_now() -> datetime:
        return datetime.now(timezone.utc)

    # ============================================================
    # CREATE
    # ============================================================

    @staticmethod
    async def create(
        db: AsyncSession,
        *,
        recipient_user_id: UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        related_group_id: UUID | None = None,
        related_expense_id: UUID | None = None,
        related_settlement_id: UUID | None = None,
        related_user_id: UUID | None = None,
        attachment_reference: str | None = None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Record one notification for the given recipient.

        The callers (expense, settlement, group flows) are responsible
        for ensuring the originating event happened first and that the
        notification is idempotent — duplicate notifications for the
        same (recipient, type, related_entity) are suppressed at the
        application level before this method is called.
        """
        notification = Notification(
            recipient_user_id=recipient_user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_group_id=related_group_id,
            related_expense_id=related_expense_id,
            related_settlement_id=related_settlement_id,
            related_user_id=related_user_id,
            attachment_reference=attachment_reference,
            context_data=context_data,
        )

        async with transaction(db):
            db.add(notification)
            await db.flush()
        return notification

    # ============================================================
    # LIST
    # ============================================================

    @staticmethod
    async def list_notifications(
        db: AsyncSession,
        recipient_user_id: UUID,
        *,
        type_filter: NotificationType | None = None,
        read_filter: str | None = None,  # "unread", "read", "all"
        limit: int | None = None,
        offset: int = 0,
    ) -> NotificationListResponse:
        """
        List the authenticated user's notifications, newest first.

        read_filter:
            - "unread"  → read_at IS NULL
            - "read"    → read_at IS NOT NULL
            - "all"     → no filter
            - None      → no filter (default)
        """
        stmt = select(Notification).where(
            Notification.recipient_user_id == recipient_user_id
        )

        if type_filter is not None:
            stmt = stmt.where(Notification.notification_type == type_filter)

        if read_filter == "unread":
            stmt = stmt.where(Notification.read_at.is_(None))
        elif read_filter == "read":
            stmt = stmt.where(Notification.read_at.isnot(None))

        stmt = stmt.order_by(Notification.created_at.desc(), Notification.id.desc())

        if offset:
            stmt = stmt.offset(offset)
        if limit is not None:
            stmt = stmt.limit(limit)

        result = await db.execute(stmt)
        items = list(result.scalars().all())

        # Build minimal response schema
        from backend.schemas.notification import NotificationItemResponse
        response_items = [
            NotificationItemResponse.model_validate(item) for item in items
        ]

        # Total count (unfiltered; client can compute unread/read from
        # the items if desired, or call the unread-count endpoint).
        count_stmt = (
            select(Notification)
            .where(Notification.recipient_user_id == recipient_user_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
        )
        if type_filter is not None:
            count_stmt = count_stmt.where(
                Notification.notification_type == type_filter
            )
        count_result = await db.execute(count_stmt)
        total = len(list(count_result.scalars().all()))

        return NotificationListResponse(
            items=response_items, total=total
        )

    # ============================================================
    # GET BY ID (user-scoped detail retrieval)
    # ============================================================

    @staticmethod
    async def get_notification(
        db: AsyncSession,
        recipient_user_id: UUID,
        notification_id: UUID,
    ) -> NotificationResponse | None:
        """
        Return one notification owned by the recipient user.
        Unknown IDs and other users' records both yield None (callers
        map None to 404 without revealing ownership).
        """
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.recipient_user_id == recipient_user_id,
            )
        )
        notification = result.scalars().first()
        if notification is None:
            return None
        from backend.schemas.notification import NotificationResponse
        return NotificationResponse.model_validate(notification)

    # ============================================================
    # MARK AS READ
    # ============================================================

    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        *,
        recipient_user_id: UUID,
        notification_id: UUID,
    ) -> Notification:
        """
        Mark a single notification as read.

        Returns the updated notification row so the caller can
        immediately reflect the new read-state in the UI.
        """
        async with transaction(db):
            notification = await db.get(
                Notification, notification_id,
            )
            if notification is None:
                raise ValueError("Notification not found.")
            if notification.recipient_user_id != recipient_user_id:
                raise ValueError(
                    "Notification does not belong to this user."
                )
            notification.read_at = datetime.now(timezone.utc)
            await db.flush()
        return notification

    # ============================================================
    # MARK ALL AS READ
    # ============================================================

    @staticmethod
    async def mark_all_as_read(
        db: AsyncSession,
        *,
        recipient_user_id: UUID,
    ) -> int:
        """
        Mark all unread notifications for the recipient as read.

        Returns the number of notifications that were updated.
        """
        now = datetime.now(timezone.utc)
        async with transaction(db):
            count = await db.execute(
                select(Notification)
                .where(
                    Notification.recipient_user_id == recipient_user_id,
                    Notification.read_at.is_(None),
                )
            )
            unread = count.scalars().all()
            for n in unread:
                n.read_at = now
            await db.flush()
        return len(unread)

    # ============================================================
    # UNREAD COUNT
    # ============================================================

    @staticmethod
    async def get_unread_count(
        db: AsyncSession,
        recipient_user_id: UUID,
    ) -> int:
        """Return the count of unread notifications for the user."""
        result = await db.execute(
            select(Notification)
            .where(
                Notification.recipient_user_id == recipient_user_id,
                Notification.read_at.is_(None),
            )
        )
        return len(result.scalars().all())

    # ============================================================
    # EVENT WIRES — expand activity → notification
    # ============================================================

    @staticmethod
    async def wire_expense_added(
        db: AsyncSession,
        *,
        user_id: UUID,  # the user who triggered the event (actor)
        group_id: UUID | None,
        expense_title: str,
        expense_amount: str | None,
        expense_category: str | None,
        expense_payer: str | None,
        expense_note: str | None,
        bill_image_ref: str | None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Wire a notification when an expense is added.

        The recipient should be every group member (including the payer)
        *except* the actor themselves. The caller typically iterates over
        group members and calls NotificationService.create() for each.
        """
        # The recipient user ID is passed per-call; the service does not
        # auto-resolve group members here to keep it flexible.
        title = "Expense added"
        message = expense_title
        if expense_amount:
            message += f" • {expense_amount}"
        if expense_category:
            message += f" • {expense_category}"
        if expense_payer:
            message += f" • Paid by {expense_payer}"
        if expense_note:
            message += f" • {expense_note}"

        notification = await NotificationService.create(
            db=db,
            recipient_user_id=user_id,  # In practice caller will iterate
            notification_type=NotificationType.EXPENSE_ADDED,
            title=title,
            message=message,
            related_group_id=group_id,
            related_expense_id=None,  # will be set by the caller after
            attachment_reference=bill_image_ref,
            context_data=context_data,
        )
        return notification

    @staticmethod
    async def wire_settlement_confirmed(
        db: AsyncSession,
        *,
        user_id: UUID,  # the user who confirmed / is involved
        group_id: UUID | None,
        settlement_amount: str | None,
        payer_name: str | None,
        receiver_name: str | None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Wire a notification when a settlement is confirmed/completed.
        """
        title = "Settlement completed"
        message = settlement_amount or "Settlement completed"
        if payer_name:
            message += f" • Paid by {payer_name}"
        if receiver_name:
            message += f" • Received from {receiver_name}"

        notification = await NotificationService.create(
            db=db,
            recipient_user_id=user_id,
            notification_type=NotificationType.SETTLEMENT_COMPLETED,
            title=title,
            message=message,
            related_group_id=group_id,
            attachment_reference=None,
            context_data=context_data,
        )
        return notification

    @staticmethod
    async def wire_group_invitation(
        db: AsyncSession,
        *,
        user_id: UUID,  # the recipient (user who was invited)
        group_id: UUID | None,
        group_name: str | None,
        inviter_name: str | None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Wire a notification when a group invitation is received.
        """
        title = "Group invitation"
        message = group_name or "New group invitation"
        if inviter_name:
            message += f" • From {inviter_name}"

        notification = await NotificationService.create(
            db=db,
            recipient_user_id=user_id,
            notification_type=NotificationType.GROUP_INVITATION,
            title=title,
            message=message,
            related_group_id=group_id,
            related_user_id=None,
            attachment_reference=None,
            context_data=context_data,
        )
        return notification

    @staticmethod
    async def wire_group_comment(
        db: AsyncSession,
        *,
        user_id: UUID,  # the recipient (group member)
        group_id: UUID | None,
        comment_author: str | None,
        comment_text: str | None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Wire a notification when a group comment is posted.
        """
        title = "Group comment"
        message = comment_text or "New comment"
        if comment_author:
            message += f" • By {comment_author}"

        notification = await NotificationService.create(
            db=db,
            recipient_user_id=user_id,
            notification_type=NotificationType.GROUP_COMMENT,
            title=title,
            message=message,
            related_group_id=group_id,
            attachment_reference=None,
            context_data=context_data,
        )
        return notification

    @staticmethod
    async def wire_member_joined_group(
        db: AsyncSession,
        *,
        user_id: UUID,  # the new member
        group_id: UUID | None,
        group_name: str | None,
        by_user_name: str | None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Wire a notification when a member joins a group.
        """
        title = "Member joined group"
        message = group_name or "Member joined group"
        if by_user_name:
            message += f" • Added by {by_user_name}"

        notification = await NotificationService.create(
            db=db,
            recipient_user_id=user_id,
            notification_type=NotificationType.MEMBER_JOINED_GROUP,
            title=title,
            message=message,
            related_group_id=group_id,
            related_user_id=user_id,
            attachment_reference=None,
            context_data=context_data,
        )
        return notification

    @staticmethod
    async def wire_bill_image_updated(
        db: AsyncSession,
        *,
        user_id: UUID,  # the recipient (group member or owner)
        group_id: UUID | None,
        bill_image_ref: str | None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Wire a notification when a bill image is updated/attached.
        """
        title = "Bill image updated"
        message = "Bill image updated"

        notification = await NotificationService.create(
            db=db,
            recipient_user_id=user_id,
            notification_type=NotificationType.BILL_IMAGE_UPDATED,
            title=title,
            message=message,
            related_group_id=group_id,
            attachment_reference=bill_image_ref,
            context_data=context_data,
        )
        return notification

    @staticmethod
    async def wire_group_settings_updated(
        db: AsyncSession,
        *,
        user_id: UUID,  # the recipient (group member)
        group_id: UUID | None,
        group_name: str | None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Wire a notification when group settings are updated.
        """
        title = "Group settings updated"
        message = group_name or "Group settings updated"

        notification = await NotificationService.create(
            db=db,
            recipient_user_id=user_id,
            notification_type=NotificationType.GROUP_SETTINGS_UPDATED,
            title=title,
            message=message,
            related_group_id=group_id,
            attachment_reference=None,
            context_data=context_data,
        )
        return notification

    @staticmethod
    async def wire_trip_report_ready(
        db: AsyncSession,
        *,
        user_id: UUID,  # the recipient
        group_id: UUID | None,
        trip_name: str | None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Wire a notification when a trip report is ready.
        """
        title = "Trip report ready"
        message = trip_name or "Trip report ready"

        notification = await NotificationService.create(
            db=db,
            recipient_user_id=user_id,
            notification_type=NotificationType.TRIP_REPORT_READY,
            title=title,
            message=message,
            related_group_id=group_id,
            attachment_reference=None,
            context_data=context_data,
        )
        return notification

    @staticmethod
    async def wire_budget_alert(
        db: AsyncSession,
        *,
        user_id: UUID,  # the recipient
        group_id: UUID | None,
        alert_title: str | None,
        alert_message: str | None,
        context_data: dict | None = None,
    ) -> Notification:
        """
        Wire a notification for a budget alert.
        """
        title = alert_title or "Budget alert"
        message = alert_message or "Budget alert triggered"

        notification = await NotificationService.create(
            db=db,
            recipient_user_id=user_id,
            notification_type=NotificationType.BUDGET_ALERT,
            title=title,
            message=message,
            related_group_id=group_id,
            attachment_reference=None,
            context_data=context_data,
        )
        return notification