# backend/schemas/profile.py

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.schemas.user import AuthenticatedUser


class UpdateProfileRequest(BaseModel):
    """
    Editable profile fields for PATCH /users/me.

    Only Full Name, Username, and Phone Number may be edited here.
    Email is intentionally NOT a field: a client-supplied email is
    ignored (extra="ignore") and never persisted by this endpoint.
    Likewise no client-supplied user_id is accepted — identity always
    comes from the Bearer session.

    Length bounds mirror the users table / signup contract; format
    rules (username charset, phone charset/digits, blank rejection)
    and uniqueness live in UserService.update_profile so service
    tests and the endpoint share one implementation.
    """

    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    username: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=32,
    )

    phone: Optional[str] = Field(
        default=None,
        min_length=7,
        max_length=20,
    )

    @field_validator("name", "username", "phone", mode="before")
    @classmethod
    def _strip(cls, value: Any) -> Any:
        # Trim surrounding whitespace only when something remains;
        # blank rejection stays in the service layer so it surfaces
        # as a 400 (existing contract: PATCH {"name": "   "} -> 400,
        # not 422 and not a silent no-op).
        if isinstance(value, str) and value.strip():
            return value.strip()
        return value


class CollectionSummary(BaseModel):
    """
    Empty-safe collection wrapper for profile dashboard sections.

    Groups/expenses/trips/settlements have no dedicated tables yet, so
    these sections return count=0/items=[] until those modules land.
    The shape is fixed now so the mobile client and future modules
    share one contract.
    """

    model_config = ConfigDict(from_attributes=True)

    count: int = 0
    items: list[Any] = Field(default_factory=list)


class AccountStatusInfo(BaseModel):
    """
    Server-calculated account-health indicator.

    Semantics (see ProfileService.get_account_health):
    - RED ("high_spend"): relevant expense total exceeds 10,000.
    - YELLOW ("dormant"): no qualifying activity for 90 days
      (and expenses within threshold).
    - GREEN ("active"): otherwise.
    RED takes precedence over YELLOW.
    """

    model_config = ConfigDict(from_attributes=True)

    status: Literal["active", "dormant", "high_spend"] = "active"
    status_color: Literal["green", "yellow", "red"] = "green"
    status_label: str = "Active"
    # Sum of the user's EXPENSE activity amounts (plain number,
    # currency-agnostic; unparseable amounts count as 0).
    expense_total: float = 0.0
    expense_threshold: float = 10000.0
    # Most recent qualifying activity (login / domain event / profile
    # change), or None when no signal exists.
    last_activity_at: Optional[datetime] = None
    inactivity_threshold_days: int = 90


class ProfileDashboardResponse(BaseModel):
    """
    Aggregated My Profile dashboard for the authenticated user.

    Response for GET /users/me/profile. Every section is derived from
    the authenticated identity — the client never supplies a user_id.
    """

    model_config = ConfigDict(from_attributes=True)

    profile: AuthenticatedUser
    groups: CollectionSummary = Field(default_factory=CollectionSummary)
    expenses: CollectionSummary = Field(default_factory=CollectionSummary)
    trips: CollectionSummary = Field(default_factory=CollectionSummary)
    settlements: CollectionSummary = Field(default_factory=CollectionSummary)
    # Server-calculated account-health indicator for the Personal
    # Information page (status + color + label + inputs). The client
    # renders it and never computes it.
    account_health: AccountStatusInfo
    # Real user-scoped activity feed (newest first), bounded by limit.
    recent_activities: list[Any] = Field(default_factory=list)


class ProfilePhotoResponse(BaseModel):
    """
    Result of profile-photo upload/removal.

    avatar_url is the persisted storage reference usable by the mobile
    app (relative path, e.g. "/uploads/profile_photos/<uuid>.jpg"),
    or null after removal.
    """

    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    avatar_url: Optional[str] = None
