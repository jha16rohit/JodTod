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
    from .group_invitation import GroupInvitation
    from .group import GroupMember
    from .otp import OTP
    from .password_reset import PasswordReset
    from .session import Session
    from .support_request import SupportRequest
    from .user_preference import UserPreference


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

    # Public handle, editable on the Personal Information page.
    # Unique when set; null for users who never chose one.
    username: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
        unique=True,
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

    # Verified provider emails (display metadata for Linked Accounts).
    # The subject columns above remain the identity source of truth;
    # these are set from verified OAuth claims at login/link time and
    # cleared on unlink. Never trusted from client input.
    google_email: Mapped[str | None] = mapped_column(
        String(320),
        nullable=True,
    )

    apple_email: Mapped[str | None] = mapped_column(
        String(320),
        nullable=True,
    )

    # Link timestamps for the Linked Accounts contract
    # (connected_at / last_verified_at). Set on link and OAuth login,
    # cleared on unlink. Display/contract metadata only.
    google_linked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    apple_linked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Profile photo
    # ------------------------------------------------------------------
    # Storage/object reference (relative path served by the API), never
    # raw image bytes. Null when the user has no photo. The file itself
    # lives in local storage (see services/profile_photo_service.py).
    avatar_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
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

    preferences: Mapped["UserPreference | None"] = relationship(
        "UserPreference",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )

    support_requests: Mapped[list["SupportRequest"]] = relationship(
        "SupportRequest",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    group_invitations: Mapped[list["GroupInvitation"]] = relationship(
        "GroupInvitation",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    group_memberships: Mapped[list["GroupMember"]] = relationship(
        "GroupMember",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
