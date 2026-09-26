"""
JodTod authentication session model.

One row represents one authenticated device/session. Raw refresh tokens are
never stored; only a cryptographic hash is persisted.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Index, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .user import User


class Session(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "sessions"

    __table_args__ = (
        Index("ix_sessions_user_id", "user_id"),
        Index("ix_sessions_refresh_token_hash", "refresh_token_hash"),
        Index("ix_sessions_device_id", "device_id"),
        Index("ix_sessions_expires_at", "expires_at"),
        Index("ix_sessions_revoked_at", "revoked_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Stable client-generated device identifier. Do not use this as a secret.
    device_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Optional human-readable device metadata.
    device_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    platform: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )

    app_version: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    # Only a digest/hash of the refresh token is stored.
    refresh_token_hash: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Used to invalidate a single rotated token/session generation.
    token_family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        default=uuid.uuid4,
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Optional reason for audit/debugging, e.g. logout, rotation reuse,
    # password reset, administrator action.
    revoke_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        INET,
        nullable=True,
    )

    user_agent: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="sessions",
    )
