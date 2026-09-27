"""
JodTod incoming group invitations.

Rows are addressed to one user (user_id = invitee, CASCADE on user
delete). There are no groups/memberships tables yet, so the invite
carries its own group snapshot (group_name, invite_code, invited_by).
status is pending until the invitee accepts or declines; only pending
rows are ever listed. Accept/decline are idempotent per row.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .user import User


class GroupInvitation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "group_invitations"

    __table_args__ = (
        Index("ix_group_invitations_user_id", "user_id"),
        Index("ix_group_invitations_status", "status"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    group_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    invite_code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    invited_by: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    # Lifecycle: pending -> accepted | declined.
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="pending",
        server_default="pending",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="group_invitations",
    )
