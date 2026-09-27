# backend/schemas/expenses.py

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SplitInput(BaseModel):
    user_id: UUID
    share_amount: str


class CreateExpenseRequest(BaseModel):
    group_id: UUID
    title: str = Field(min_length=1, max_length=120)
    amount: str
    payer_user_id: Optional[UUID] = None
    split_type: str = "equal"
    participant_ids: list[UUID] = Field(default_factory=list)
    splits: list[SplitInput] = Field(default_factory=list)
    description: Optional[str] = Field(default=None, max_length=500)


class SplitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    display_name: str = ""
    share_amount: str = "0.00"


class ExpenseResponse(BaseModel):
    id: UUID
    group_id: UUID
    title: str
    description: Optional[str] = None
    amount: str
    currency: str
    payer_user_id: UUID
    payer_name: str = ""
    expense_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    splits: list[SplitResponse] = Field(default_factory=list)


class ExpenseListResponse(BaseModel):
    expenses: list[ExpenseResponse] = Field(default_factory=list)
    total: int = 0
