# backend/schemas/support.py

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

SupportRequestType = Literal["support", "bug", "feature_request"]
SupportRequestStatus = Literal["open", "in_progress", "resolved", "closed"]


class FaqResponse(BaseModel):
    """One active FAQ entry (read-only from the mobile client)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question: str
    answer: str
    category: str
    display_order: int


class FaqListResponse(BaseModel):
    """Active FAQs, curated display order (then question for ties)."""

    faqs: list[FaqResponse] = Field(default_factory=list)


class CreateSupportRequest(BaseModel):
    """
    File a support / bug / feature request for the authenticated user.

    Identity comes from the Bearer session; app_version/screen are
    optional client-reported context only.
    """

    model_config = ConfigDict(extra="ignore")

    type: SupportRequestType
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    app_version: Optional[str] = Field(default=None, max_length=64)
    screen: Optional[str] = Field(default=None, max_length=120)


class SupportRequestResponse(BaseModel):
    """One support request owned by the authenticated user."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    subject: str
    description: str
    app_version: Optional[str] = None
    screen: Optional[str] = None
    status: str
    created_at: datetime


class SupportRequestListResponse(BaseModel):
    """The authenticated user's own requests, newest first."""

    requests: list[SupportRequestResponse] = Field(default_factory=list)
