"""
JodTod support-request model (contact / bug / feature).

One generalized table with a type discriminator instead of three
duplicate tables. Rows belong to the authenticated user that filed
them (user_id FK, CASCADE on user delete). The mobile client can
create requests and list its own; there is no admin surface in scope.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .user import User


class SupportRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "support_requests"

    __table_args__ = (
        Index("ix_support_requests_user_id", "user_id"),
        Index("ix_support_requests_type", "type"),
        Index("ix_support_requests_status", "status"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # One of: support | bug | feature_request (validated in service).
    type: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
    )

    subject: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Client-reported context; optional, never trusted for identity.
    app_version: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    screen: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    # Lifecycle: open -> in_progress -> resolved -> closed.
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="open",
        server_default="open",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="support_requests",
    )
