"""
JodTod support routes: read-only FAQs + authenticated requests.

FAQ content is read-only from the mobile client (no create/update
endpoints). Support requests require authentication; identity always
comes from the Bearer session, never from client input.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User
from backend.schemas.support import (
    CreateSupportRequest,
    FaqListResponse,
    FaqResponse,
    SupportRequestListResponse,
    SupportRequestResponse,
)
from backend.services.faq_service import FaqService
from backend.services.support_service import SupportService

router = APIRouter(
    prefix="/support",
    tags=["Support"],
)


@router.get(
    "/faqs",
    response_model=FaqListResponse,
)
async def list_faqs(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = Query(default=None, max_length=64),
    q: Optional[str] = Query(default=None, max_length=120),
) -> FaqListResponse:
    """
    List active FAQs in curated order, with optional category filter
    and case-insensitive partial search over question/answer/category.
    """
    _ = identity  # authenticated read; rows are global content.
    faqs = await FaqService.list_faqs(db, category=category, query=q)
    return FaqListResponse(
        faqs=[FaqResponse.model_validate(f) for f in faqs]
    )


@router.post(
    "/requests",
    response_model=SupportRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_support_request(
    payload: CreateSupportRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> SupportRequestResponse:
    """
    File a support / bug / feature request for the authenticated user.
    """
    try:
        created = await SupportService.create_request(
            db,
            identity.id,
            type=payload.type,
            subject=payload.subject,
            description=payload.description,
            app_version=payload.app_version,
            screen=payload.screen,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    await db.refresh(created)
    return SupportRequestResponse.model_validate(created)


@router.get(
    "/requests",
    response_model=SupportRequestListResponse,
)
async def list_my_support_requests(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> SupportRequestListResponse:
    """
    List the authenticated user's own support requests, newest first.
    """
    rows = await SupportService.list_my_requests(db, identity.id)
    return SupportRequestListResponse(
        requests=[SupportRequestResponse.model_validate(r) for r in rows]
    )
