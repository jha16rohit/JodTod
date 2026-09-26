"""
JodTod password reset token model.

Only a cryptographic token hash is stored. Raw reset tokens are never stored.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .user import User


class PasswordReset(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "password_resets"

    __table_args__ = (
        Index("ix_password_resets_user_id", "user_id"),
        Index("ix_password_resets_email", "email"),
        Index("ix_password_resets_expires_at", "expires_at"),
        Index("ix_password_resets_token_hash", "token_hash"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
    )

    token_hash: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="password_resets",
    )
