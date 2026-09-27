from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from backend.models.notification import Notification, NotificationType


class NotificationItemResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    created_at: datetime
    read_at: datetime | None = None
    related_group_id: str | None = None
    related_expense_id: str | None = None
    related_settlement_id: str | None = None
    related_user_id: str | None = None
    attachment_reference: str | None = None
    metadata: dict | None = None

    model_config = {"from_attributes": True}


class NotificationResponse(NotificationItemResponse):
    pass


class NotificationCreate(BaseModel):
    recipient_user_id: UUID
    notification_type: NotificationType
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1)
    related_group_id: UUID | None = None
    related_expense_id: UUID | None = None
    related_settlement_id: UUID | None = None
    related_user_id: UUID | None = None
    attachment_reference: str | None = None
    metadata: dict | None = None


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int


class MarkNotificationReadRequest(BaseModel):
    notification_id: UUID


class UnreadCountResponse(BaseModel):
    unread_count: int