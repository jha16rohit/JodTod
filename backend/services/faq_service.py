# backend/services/faq_service.py

"""
Read-only FAQ content for Help & Support.

Only is_active rows are served, in curated display_order. Filtering
(category) and search (question/answer/category, case-insensitive
partial match) happen server-side so small clients stay simple; the
mobile screens additionally filter locally for instant keystroke
feedback without a request per keystroke.
"""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.faq import Faq


class FaqService:
    """List active FAQs with optional category + search filters."""

    @staticmethod
    async def list_faqs(
        db: AsyncSession,
        *,
        category: str | None = None,
        query: str | None = None,
    ) -> list[Faq]:
        stmt = select(Faq).where(Faq.is_active.is_(True))

        if category is not None and category.strip():
            stmt = stmt.where(Faq.category == category.strip())

        if query is not None and query.strip():
            pattern = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Faq.question.ilike(pattern),
                    Faq.answer.ilike(pattern),
                    Faq.category.ilike(pattern),
                )
            )

        stmt = stmt.order_by(Faq.display_order.asc(), Faq.question.asc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_categories(db: AsyncSession) -> list[str]:
        """Distinct categories that have at least one active FAQ."""
        result = await db.execute(
            select(func.distinct(Faq.category))
            .where(Faq.is_active.is_(True))
            .order_by(Faq.category.asc())
        )
        return [row for row in result.scalars().all() if row]
