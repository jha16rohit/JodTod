# backend/services/profile_service.py

"""
My Profile dashboard aggregation for the authenticated user.

All queries are scoped to the authenticated user's id — the mobile
client never supplies a user_id for these operations.

Current data sources (inspected, not assumed):
- users row: profile fields incl. avatar_url.
- activities: the only user-scoped related-event table; feeds
  recent_activities (newest first, bounded).
- groups / group_members: membership counts (groups, trips subset).
- expenses: expenses in the user's groups.
- settlements: confirmed (PAID) payments involving the user.
  Collection items stay [] (counts only); this file stays the single
  aggregation point, never a second source of truth.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.activity import Activity, ActivityType
from backend.models.user import User
from backend.services.activity_service import ActivityService
from backend.services.balance_service import money
from backend.services.expense_service import ExpenseService
from backend.services.group_service import GroupService
from backend.services.settlement_service import SettlementService


# Personal Information account-status indicator.
#
# Data model (inspected, not assumed):
# - groups/expenses/trips/settlements have NO dedicated tables, so the
#   user's EXPENSE activity events are the business-model proxy for
#   "relevant expenses". Amounts are stored as pre-formatted display
#   strings (e.g. "₹2,850") and parsed numerically here.
# - Qualifying account activity = the most recent of:
#     users.last_login_at  (set on every password/OTP/OAuth login),
#     activities.occurred_at (newest domain event: expense, settlement,
#       member, or group event),
#     users.updated_at (any profile/photo change).
#   sessions.last_used_at is deliberately EXCLUDED: token-refresh
#   rotation touches it as background infrastructure, which would mask
#   genuine dormancy. The login moment itself is already captured by
#   last_login_at.
EXPENSE_THRESHOLD: float = 10000.0
INACTIVITY_THRESHOLD_DAYS: int = 90

_AMOUNT_NUMBER = re.compile(r"-?\d[\d,]*(\.\d+)?")


def parse_expense_amount(raw: Any) -> float:
    """
    Parse a stored activity amount string to a plain number.

    Display strings such as "₹2,850" or "Rs. 10,000.50" parse to
    2850.0 / 10000.50. Missing or unparseable values count as 0.0 so
    one malformed row can never flip the indicator.
    """
    if raw is None:
        return 0.0
    if isinstance(raw, (int, float)):
        return float(raw)
    if not isinstance(raw, str):
        return 0.0
    match = _AMOUNT_NUMBER.search(raw.replace(" ", ""))
    if match is None:
        return 0.0
    try:
        return float(match.group(0).replace(",", ""))
    except ValueError:
        return 0.0


class ProfileService:
    """Read-only dashboard aggregation + profile field updates."""

    @staticmethod
    def _as_aware(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    @staticmethod
    async def get_account_health(
        db: AsyncSession,
        user: User,
        *,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Calculate the Personal Information status indicator.

        Precedence: RED (expense_total > 10,000) beats YELLOW
        (no qualifying activity for 90 days) beats GREEN.
        All inputs are server-side; the client only renders the result.

        Both activity inputs (the EXPENSE amount list and the newest
        event timestamp) come from ONE statement using scalar subqueries,
        so this costs a single round trip instead of two.
        """
        current = now or datetime.now(timezone.utc)
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)

        row = (
            await db.execute(
                select(
                    select(func.array_agg(Activity.amount))
                    .where(
                        Activity.user_id == user.id,
                        Activity.type == ActivityType.EXPENSE,
                    )
                    .scalar_subquery(),
                    select(func.max(Activity.occurred_at))
                    .where(Activity.user_id == user.id)
                    .scalar_subquery(),
                )
            )
        ).one()
        amounts, latest_event = row

        expense_total = sum(parse_expense_amount(a) for a in (amounts or ()))

        candidates = [
            ProfileService._as_aware(user.last_login_at),
            ProfileService._as_aware(latest_event),
            ProfileService._as_aware(user.updated_at),
        ]
        seen = [c for c in candidates if c is not None]
        last_activity = max(seen) if seen else None

        if expense_total > EXPENSE_THRESHOLD:
            status, color, label = "high_spend", "red", "High spend"
        elif (
            last_activity is None
            or (current - last_activity).days >= INACTIVITY_THRESHOLD_DAYS
        ):
            status, color, label = "dormant", "yellow", "Dormant"
        else:
            status, color, label = "active", "green", "Active"

        return {
            "status": status,
            "status_color": color,
            "status_label": label,
            "expense_total": expense_total,
            "expense_threshold": EXPENSE_THRESHOLD,
            "last_activity_at": last_activity,
            "inactivity_threshold_days": INACTIVITY_THRESHOLD_DAYS,
        }

    @staticmethod
    async def get_dashboard(
        db: AsyncSession,
        user_id: UUID,
        recent_limit: int = 10,
        *,
        user: User | None = None,
    ) -> dict[str, Any]:
        """
        Build the dashboard payload for the authenticated user.

        Returns dict with keys: profile (User), groups, expenses, trips,
        settlements (each {count, items}), account_health (status dict),
        recent_activities (list).

        `user` lets a caller hand over the User it already loaded (the
        authenticated identity), avoiding a redundant re-read of the
        same row. It is optional so direct service callers that only
        have an id keep working.
        """
        if user is None:
            user = await db.get(User, user_id)
        if user is None:
            raise LookupError("Authenticated user not found.")

        # Server-side pagination: ask the database for only the rows the
        # dashboard renders. Previously the whole history was loaded and
        # then sliced in Python, which grows without bound.
        recent = await ActivityService.list_activities(
            db,
            user_id,
            limit=max(recent_limit, 0),
        )

        group_count = await GroupService.count_my_groups(db, user_id)
        trip_count = await GroupService.count_my_trips(db, user_id)
        expense_count = await ExpenseService.count_my_group_expenses(
            db, user_id
        )
        settlement_count = await SettlementService.count_my_confirmed(
            db, user_id
        )

        return {
            "profile": user,
            "groups": {"count": group_count, "items": []},
            "expenses": {"count": expense_count, "items": []},
            "trips": {"count": trip_count, "items": []},
            "settlements": {"count": settlement_count, "items": []},
            "account_health": await ProfileService.get_account_health(
                db, user
            ),
            "recent_activities": [
                {
                    "id": str(a.id),
                    "type": a.type.value if hasattr(a.type, "value") else str(a.type),
                    "title": a.title,
                    "subtitle": a.subtitle,
                    "amount": a.amount,
                    "occurred_at": a.occurred_at.isoformat() if a.occurred_at else None,
                    "group_name": a.group_name,
                    "actor_name": a.actor_name,
                    "status": a.status,
                }
                for a in recent
            ],
        }
