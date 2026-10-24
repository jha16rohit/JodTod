"""
JodTod settlements: "who paid whom to reduce/clear that debt".

A settlement row is a payer-initiated payment claim against the debt
computed from expenses. It MUST NOT reduce the financial balance until
the receiver confirms it:

    PENDING   payer claimed "I paid"; debt still fully active.
    PAID      receiver confirmed; balance reduced by this amount.
    REJECTED  receiver denied receipt; debt unchanged.
    CANCELLED payer withdrew the claim before confirmation; unchanged.
    PARTIALLY_PAID reserved for installment chains (not produced by the
              single-confirm flow: each confirmed partial payment is
              PAID and the remaining debt is derived, never stored).

Confirmed rows (PAID) are immutable: no edit, no delete, no status
change — a reversal would be a new financial event, not a mutation.
Only PENDING rows transition, exactly once, under row lock.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .group import Group
    from .user import User


class SettlementStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class PaymentMethod(str, enum.Enum):
    MARKED_AS_PAID = "marked_as_paid"
    PARTIAL_PAYMENT = "partial_payment"


# States a settlement can still leave (exactly-once transitions).
TRANSITIONABLE_STATUSES = frozenset({SettlementStatus.PENDING})

# Confirmed history: immutable, always visible, never re-counted.
CONFIRMED_STATUSES = frozenset({SettlementStatus.PAID})


class Settlement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "settlements"

    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint(
            "payer_user_id != receiver_user_id",
            name="payer_is_not_receiver",
        ),
        Index("ix_settlements_group_id", "group_id"),
        Index("ix_settlements_payer_user_id", "payer_user_id"),
        Index("ix_settlements_receiver_user_id", "receiver_user_id"),
        Index("ix_settlements_status", "status"),
        Index("ix_settlements_created_at", "created_at"),
        Index("ix_settlements_confirmed_at", "confirmed_at"),
        # Pending-confirmation queue: receiver's unconfirmed claims,
        # newest first.
        Index(
            "ix_settlements_receiver_status_created",
            "receiver_user_id",
            "status",
            "created_at",
        ),
        # Group history: newest confirmed payments first.
        Index(
            "ix_settlements_group_status_created",
            "group_id",
            "status",
            "created_at",
        ),
        # Person-to-person history across common groups.
        Index(
            "ix_settlements_payer_receiver_created",
            "payer_user_id",
            "receiver_user_id",
            "created_at",
        ),
    )

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
    )

    payer_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    receiver_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    status: Mapped[SettlementStatus] = mapped_column(
        Enum(
            SettlementStatus,
            name="settlement_status",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
        default=SettlementStatus.PENDING,
        server_default=SettlementStatus.PENDING.value,
    )

    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(
            PaymentMethod,
            name="payment_method",
            values_callable=lambda values: [item.value for item in values],
        ),
        nullable=False,
        default=PaymentMethod.MARKED_AS_PAID,
        server_default=PaymentMethod.MARKED_AS_PAID.value,
    )

    note: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    # Client-generated idempotency key (one UUID per user action).
    # Unique when present so double-taps/retries collapse to one row;
    # enforced by a partial unique index in the migration.
    idempotency_key: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        unique=True,
    )

    initiated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    rejection_reason: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    group: Mapped["Group"] = relationship(
        "Group",
        back_populates="settlements",
    )
