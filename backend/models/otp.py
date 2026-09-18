"""
JodTod OTP model.

Only a hash of the OTP is persisted. The plaintext OTP exists only for the
short duration required to deliver it to the user.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .user import User


class OTPPurpose(str, enum.Enum):
    PHONE_SIGNUP = "phone_signup"
    PHONE_LOGIN = "phone_login"
    PHONE_VERIFICATION = "phone_verification"
    EMAIL_SIGNUP = "email_signup"
    EMAIL_LOGIN = "email_login"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"


class OTPDestinationType(str, enum.Enum):
    PHONE = "phone"
    EMAIL = "email"


class OTP(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "otp_records"

    __table_args__ = (
        Index("ix_otp_user_id", "user_id"),
        Index("ix_otp_destination", "destination"),
        Index("ix_otp_expires_at", "expires_at"),
        Index("ix_otp_purpose_destination", "purpose", "destination"),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )

    purpose: Mapped[OTPPurpose] = mapped_column(
        Enum(
            OTPPurpose,
            name="otp_purpose",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
    )

    destination_type: Mapped[OTPDestinationType] = mapped_column(
        Enum(
            OTPDestinationType,
            name="otp_destination_type",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
    )

    # Normalized phone number or normalized email address.
    destination: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
    )

    # Cryptographic hash of the generated OTP.
    otp_hash: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    max_attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
        server_default="5",
    )

    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Explicit cooldown anchor. The service uses this to enforce resend limits.
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    resend_available_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Optional lockout timestamp after too many verification attempts.
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped["User | None"] = relationship(
        "User",
        back_populates="otp_records",
    )
