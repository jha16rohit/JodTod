"""
JodTod notification model.

One row represents one user-visible notification delivered to a recipient.
Notifications are scoped to the recipient user and may reference
related entities (group, expense, settlement, user) when applicable.

All queries are recipient-user-scoped. Read-state is tracked via
read_at; null = unread, non-null = read at that timestamp.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class NotificationType(str, enum.Enum):
    EXPENSE_ADDED = "expense_added"
    SETTLEMENT_COMPLETED = "settlement_completed"
    GROUP_INVITATION = "group_invitation"
    GROUP_COMMENT = "group_comment"
    TRIP_REPORT_READY = "trip_report_ready"
    BUDGET_ALERT = "budget_alert"
    MEMBER_JOINED_GROUP = "member_joined_group"
    BILL_IMAGE_UPDATED = "bill_image_updated"
    GROUP_SETTINGS_UPDATED = "group_settings_updated"
    SYSTEM = "system"


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "notifications"

    __table_args__ = (
        Index(
            "ix_notifications_recipient_user_id",
            "recipient_user_id",
        ),
        Index(
            "ix_notifications_recipient_user_id_created_at",
            "recipient_user_id",
            "created_at",
        ),
        Index(
            "ix_notifications_recipient_user_id_read_status",
            "recipient_user_id",
            "read_at",
        ),
        Index(
            "ix_notifications_recipient_type_created",
            "recipient_user_id",
            "notification_type",
            "created_at",
        ),
    )

    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(
            NotificationType,
            name="notification_type",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Related entities (optional FKs).
    # ------------------------------------------------------------------
    related_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="SET NULL"),
        nullable=True,
    )

    related_expense_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("expenses.id", ondelete="SET NULL"),
        nullable=True,
    )

    related_settlement_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("settlements.id", ondelete="SET NULL"),
        nullable=True,
    )

    related_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Optional attachment/bill reference (e.g. Supabase storage key or
    # local upload path for a bill image).
    attachment_reference: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # Type‑specific free-form context (e.g. split info, participant names,
    # counter‑party avatars, etc.). Stored as JSONB so the schema stays
    # flat while still allowing rich per‑type data.
    context_data: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Read‑state.
    # ------------------------------------------------------------------
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )