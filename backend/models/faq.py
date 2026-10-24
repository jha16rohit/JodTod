"""
JodTod FAQ content model.

Backend-managed, read-only from the mobile client. Only rows with
is_active=True are ever served. Ordering is explicit via
display_order so curated content order survives inserts.
"""

from __future__ import annotations

from sqlalchemy import Boolean, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Faq(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "faqs"

    __table_args__ = (
        Index("ix_faqs_is_active", "is_active"),
        Index("ix_faqs_category", "category"),
        Index("ix_faqs_display_order", "display_order"),
    )

    question: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    answer: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="general",
        server_default="general",
    )

    display_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
