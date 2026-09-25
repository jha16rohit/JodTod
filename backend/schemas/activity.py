# backend/schemas/activity.py

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from backend.models.activity import ActivityType


ActivityTypeFilter = Literal["all", "expense", "settlement", "member", "group"]
ActivityDateRange = Literal["all", "today", "week", "month"]


class ActivityParticipant(BaseModel):
    """
    One expense split participant.
    """

    name: str = Field(min_length=1, max_length=120)
    share: str = Field(min_length=1, max_length=64)
    avatar: str | None = Field(default=None, max_length=500)


class ActivityCreate(BaseModel):
    """
    Payload for recording one activity event for the authenticated user.
    """

    type: ActivityType
    title: str = Field(min_length=1, max_length=200)
    subtitle: str | None = Field(default=None, max_length=300)
    amount: str | None = Field(default=None, max_length=64)
    occurred_at: datetime | None = None
    member_key: str | None = Field(default=None, max_length=64)
    group_name: str | None = Field(default=None, max_length=120)
    actor_name: str | None = Field(default=None, max_length=120)
    actor_avatar: str | None = Field(default=None, max_length=500)
    counterparty_name: str | None = Field(default=None, max_length=120)
    counterparty_avatar: str | None = Field(default=None, max_length=500)
    counterparty_sub: str | None = Field(default=None, max_length=160)
    category: str | None = Field(default=None, max_length=120)
    status: str | None = Field(default=None, max_length=64)
    description: str | None = None
    split_type: str | None = Field(default=None, max_length=64)
    split_among: str | None = Field(default=None, max_length=64)
    each_share: str | None = Field(default=None, max_length=64)
    bill_image: str | None = Field(default=None, max_length=500)
    participants: list[ActivityParticipant] | None = None


class ActivityResponse(BaseModel):
    """
    One activity record as returned by the list endpoint.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: ActivityType
    title: str
    subtitle: str | None = None
    amount: str | None = None
    occurred_at: datetime
    member_key: str | None = None
    group_name: str | None = None
    actor_name: str | None = None
    actor_avatar: str | None = None
    counterparty_name: str | None = None
    counterparty_avatar: str | None = None
    counterparty_sub: str | None = None
    category: str | None = None
    status: str | None = None
    description: str | None = None
    split_type: str | None = None
    split_among: str | None = None
    each_share: str | None = None
    bill_image: str | None = None
    participants: list[ActivityParticipant] | None = None
    created_at: datetime


class ActivityListResponse(BaseModel):
    """
    Activity list payload, newest first.
    """

    items: list[ActivityResponse]
