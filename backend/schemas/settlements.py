# backend/schemas/settlements.py

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class InitiateSettlementRequest(BaseModel):
    group_id: UUID
    receiver_user_id: UUID
    amount: str
    payment_method: str = "marked_as_paid"
    note: Optional[str] = Field(default=None, max_length=200)
    idempotency_key: Optional[str] = Field(default=None, max_length=64)


class RejectSettlementRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=200)


class SettlementResponse(BaseModel):
    id: UUID
    group_id: UUID
    group_name: str = ""
    payer_user_id: UUID
    payer_name: str = ""
    receiver_user_id: UUID
    receiver_name: str = ""
    amount: str
    currency: str
    status: str
    payment_method: str
    note: Optional[str] = None
    rejection_reason: Optional[str] = None
    initiated_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class PendingConfirmationResponse(BaseModel):
    pending: list[SettlementResponse] = Field(default_factory=list)


class SettlementHistoryResponse(BaseModel):
    settlements: list[SettlementResponse] = Field(default_factory=list)
    total: int = 0


class PersonSummaryResponse(BaseModel):
    user_id: UUID
    display_name: str
    profile_photo: Optional[str] = None
    common_group_count: int = 0
    you_owe: str = "0.00"
    they_owe: str = "0.00"
    net_balance: str = "0.00"
    direction: str = "SETTLED"


class PeopleListResponse(BaseModel):
    people: list[PersonSummaryResponse] = Field(default_factory=list)
    total: int = 0


class PersonGroupResponse(BaseModel):
    group_id: UUID
    name: str
    group_type: str = "other"
    image_url: Optional[str] = None
    you_owe: str = "0.00"
    they_owe: str = "0.00"
    net_balance: str = "0.00"
    direction: str = "SETTLED"


class PersonDetailResponse(BaseModel):
    user_id: UUID
    display_name: str
    profile_photo: Optional[str] = None
    you_owe: str = "0.00"
    they_owe: str = "0.00"
    net_balance: str = "0.00"
    direction: str = "SETTLED"
    groups: list[PersonGroupResponse] = Field(default_factory=list)
