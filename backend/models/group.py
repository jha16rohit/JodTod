"""
JodTod groups: the common container for shared financial activity.

A group represents any shared-expense scenario (a trip, hostel food
contribution, rent, chai/food among friends, college or household
expenses). "Trip" is a group use-case (GroupType.TRIP), not a separate
domain — every settlement calculation runs against groups.

Lifecycle (GroupLifecycle: ACTIVE / ARCHIVED) is independent from the
settlement state of a group (all member nets zero or not), which is
derived from expenses minus confirmed settlements and never stored.
"""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .expense import Expense
    from .settlement import Settlement
    from .user import User


class GroupType(str, enum.Enum):
    TRIP = "trip"
    HOSTEL = "hostel"
    FOOD = "food"
    RENT = "rent"
    FRIENDS = "friends"
    COLLEGE = "college"
    OTHER = "other"


class GroupLifecycle(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class MemberRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class Group(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "groups"

    __table_args__ = (
        Index("ix_groups_created_by", "created_by"),
        Index("ix_groups_lifecycle", "lifecycle"),
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    group_type: Mapped[GroupType] = mapped_column(
        Enum(
            GroupType,
            name="group_type",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
        default=GroupType.OTHER,
        server_default=GroupType.OTHER.value,
    )

    # ISO 4217 currency for every expense/settlement in this group.
    # Money never mixes across currencies; all math stays in group
    # currency with Numeric/Decimal (never float).
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    lifecycle: Mapped[GroupLifecycle] = mapped_column(
        Enum(
            GroupLifecycle,
            name="group_lifecycle",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
        default=GroupLifecycle.ACTIVE,
        server_default=GroupLifecycle.ACTIVE.value,
    )

    # Join code shared via invite links. Unique so an accepted
    # group_invitation snapshot can resolve to exactly one group.
    invite_code: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        unique=True,
    )

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    members: Mapped[list["GroupMember"]] = relationship(
        "GroupMember",
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    expenses: Mapped[list["Expense"]] = relationship(
        "Expense",
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    settlements: Mapped[list["Settlement"]] = relationship(
        "Settlement",
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class GroupMember(Base, UUIDPrimaryKeyMixin):
    """One user's membership in one group (unique pair)."""

    __tablename__ = "group_members"

    __table_args__ = (
        UniqueConstraint(
            "group_id", "user_id", name="uq_group_members_pair"
        ),
        Index("ix_group_members_group_id", "group_id"),
        Index("ix_group_members_user_id", "user_id"),
    )

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[MemberRole] = mapped_column(
        Enum(
            MemberRole,
            name="member_role",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
        default=MemberRole.MEMBER,
        server_default=MemberRole.MEMBER.value,
    )

    group: Mapped["Group"] = relationship(
        "Group",
        back_populates="members",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="group_memberships",
    )
