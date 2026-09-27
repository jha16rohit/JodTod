# backend/schemas/preferences.py

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

CurrencyCode = Literal["INR"]
DateFormat = Literal["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]
WeekStart = Literal["monday", "sunday"]
AppLanguage = Literal["en"]
DisplayNameChoice = Literal["account_name", "username"]


class PreferencesResponse(BaseModel):
    """
    Static preferences for the authenticated user.

    Missing preference rows are materialized with safe defaults
    (INR / DD/MM/YYYY / monday / en), so every field is always present.
    """

    model_config = ConfigDict(from_attributes=True)

    currency: CurrencyCode = "INR"
    date_format: DateFormat = "DD/MM/YYYY"
    start_of_week: WeekStart = "monday"
    app_language: AppLanguage = "en"
    display_name: DisplayNameChoice = "account_name"


class UpdatePreferencesRequest(BaseModel):
    """
    Partial preference update for PATCH /users/me/preferences.

    Only supplied fields change; omitted fields keep their stored
    values. Values outside the allowlists are rejected with 422 by
    FastAPI before any database write happens.
    """

    model_config = ConfigDict(extra="ignore")

    currency: Optional[CurrencyCode] = Field(default=None)
    date_format: Optional[DateFormat] = Field(default=None)
    start_of_week: Optional[WeekStart] = Field(default=None)
    app_language: Optional[AppLanguage] = Field(default=None)
    display_name: Optional[DisplayNameChoice] = Field(default=None)


class NotificationCountsResponse(BaseModel):
    """
    Dynamic notification counts for the authenticated user.

    Derived at read time from the user's real activity rows (no
    notification tables exist yet): EXPENSE events, SETTLEMENT events,
    and MEMBER (invitation/member) events. Always numbers, never null.
    """

    expense_updates: int = 0
    settlement_reminders: int = 0
    group_invitations: int = 0
