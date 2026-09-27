"""
JodTod per-user static preferences.

One row per user (user_id unique). Holds STATIC configuration only:
currency, date format, start of week, app language.

Dynamic notification data (unread/pending counts) is NOT stored here;
counts are derived at read time from the user's activity rows (see
PreferencesService.get_notification_counts) until a dedicated
notification system lands.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .user import User


class UserPreference(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "user_preferences"

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_preferences_user_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ISO 4217 code. Only "INR" is applicable for now; the allowlist
    # lives in PreferencesService so validation stays in one place.
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    date_format: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="DD/MM/YYYY",
        server_default="DD/MM/YYYY",
    )

    start_of_week: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="monday",
        server_default="monday",
    )

    # BCP-47-ish tag. Only "en" (English) exists for now.
    app_language: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
        default="en",
        server_default="en",
    )

    # Which stored name the profile UI presents as primary:
    # "account_name" (users.name) or "username" (users.username).
    # Both fields stay stored; only presentation changes.
    display_name: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="account_name",
        server_default="account_name",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="preferences",
    )
