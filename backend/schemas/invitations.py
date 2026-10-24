# backend/schemas/invitations.py

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GroupInvitationResponse(BaseModel):
    """One invitation addressed to the authenticated user."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_name: str
    invite_code: str
    invited_by: Optional[str] = None
    status: str
    created_at: datetime


class GroupInvitationListResponse(BaseModel):
    """Pending invitations, newest first (never null)."""

    invitations: list[GroupInvitationResponse] = Field(default_factory=list)
