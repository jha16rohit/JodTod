"""
JodTod activity event model.

One row represents one user-visible activity feed event
(expense, settlement, member event, or group update).

Rows are scoped to the owning user. The mobile Activity panel
lists them newest-first and groups them by calendar day
(Today / Yesterday / older dates) using occurred_at.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ActivityType(str, enum.Enum):
    EXPENSE = "expense"
    SETTLEMENT = "settlement"
    MEMBER = "member"
    GROUP = "group"


class Activity(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "activities"

    __table_args__ = (
        Index("ix_activities_user_id", "user_id"),
        Index("ix_activities_type", "type"),
        Index("ix_activities_occurred_at", "occurred_at"),
        Index("ix_activities_member_key", "member_key"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    type: Mapped[ActivityType] = mapped_column(
        Enum(
            ActivityType,
            name="activity_type",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    subtitle: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
    )

    # Pre-formatted display amount (e.g. "₹2,850"). Formatting stays
    # client-side; the backend stores the already-formatted string.
    amount: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    # Event timestamp used for Today / Yesterday / older-date grouping.
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Opaque member key used by the member filter (e.g. "neha").
    member_key: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    group_name: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Detail attributes.
    #
    # No groups/expenses/settlements/member tables exist in this schema,
    # so the event row itself carries the attributes the detail screens
    # render (actor/counterparty, category, status, split breakdown,
    # free-text description). Nothing here duplicates another table.
    # ------------------------------------------------------------------
    actor_name: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    actor_avatar: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    counterparty_name: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    counterparty_avatar: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    counterparty_sub: Mapped[str | None] = mapped_column(
        String(160),
        nullable=True,
    )

    category: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    status: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    split_type: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    split_among: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    each_share: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    bill_image: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # Expense split participants: [{name, share, avatar}].
    participants: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
    )
