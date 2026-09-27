# backend/services/support_service.py

"""
Authenticated support requests (contact / bug / feature_request).

One generalized model with a type discriminator. Creation validates
type, subject, and description; identity is always the authenticated
user passed in by the route — never client-supplied. Listing is
scoped to the caller's own rows, newest first.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import transaction
from backend.models.support_request import SupportRequest

VALID_TYPES = ("support", "bug", "feature_request")
OPEN_STATUS = "open"


class SupportService:
    """Create + list the authenticated user's support requests."""

    @staticmethod
    async def create_request(
        db: AsyncSession,
        user_id: UUID,
        *,
        type: str,
        subject: str,
        description: str,
        app_version: Optional[str] = None,
        screen: Optional[str] = None,
    ) -> SupportRequest:
        cleaned_type = (type or "").strip()
        if cleaned_type not in VALID_TYPES:
            raise ValueError(
                "Unsupported request type. Use support, bug, or "
                "feature_request."
            )

        cleaned_subject = (subject or "").strip()
        if len(cleaned_subject) < 3 or len(cleaned_subject) > 200:
            raise ValueError(
                "Subject must be 3-200 characters."
            )

        cleaned_description = (description or "").strip()
        if len(cleaned_description) < 10 or len(cleaned_description) > 5000:
            raise ValueError(
                "Description must be 10-5000 characters."
            )

        request = SupportRequest(
            user_id=user_id,
            type=cleaned_type,
            subject=cleaned_subject,
            description=cleaned_description,
            app_version=(app_version or "").strip() or None,
            screen=(screen or "").strip() or None,
            status=OPEN_STATUS,
        )
        async with transaction(db):
            db.add(request)
            await db.flush()
        return request

    @staticmethod
    async def list_my_requests(
        db: AsyncSession,
        user_id: UUID,
    ) -> list[SupportRequest]:
        result = await db.execute(
            select(SupportRequest)
            .where(SupportRequest.user_id == user_id)
            .order_by(SupportRequest.created_at.desc())
        )
        return list(result.scalars().all())
