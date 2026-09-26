"""
JodTod user/account model.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .email_verification import EmailVerification
    from .otp import OTP
    from .password_reset import PasswordReset
    from .session import Session


class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"
    DISABLED = "disabled"
    DELETED = "deleted"


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_phone", "phone"),
        Index("ix_users_account_status", "account_status"),
    )

    # ------------------------------------------------------------------
    # Identity
    # ------------------------------------------------------------------
    name: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    email: Mapped[str | None] = mapped_column(
        String(320),
        nullable=True,
        unique=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
        unique=True,
    )

    # Argon2id encoded password hash. Never store a plaintext password.
    password_hash: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Verification state
    # ------------------------------------------------------------------
    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    phone_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    # ------------------------------------------------------------------
    # Account lifecycle
    # ------------------------------------------------------------------
    account_status: Mapped[AccountStatus] = mapped_column(
        Enum(
            AccountStatus,
            name="account_status",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
        default=AccountStatus.PENDING,
        server_default=AccountStatus.PENDING.value,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    # Optional administrative/user lifecycle timestamps.
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # OAuth identities
    # ------------------------------------------------------------------
    # Provider subject identifiers are opaque provider IDs, not access tokens.
    google_subject: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
    )

    apple_subject: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    sessions: Mapped[list["Session"]] = relationship(
        "Session",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    otp_records: Mapped[list["OTP"]] = relationship(
        "OTP",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    email_verifications: Mapped[list["EmailVerification"]] = relationship(
        "EmailVerification",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    password_resets: Mapped[list["PasswordReset"]] = relationship(
        "PasswordReset",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
