# backend/services/preferences_service.py

"""
Per-user static preferences + dynamic notification counts.

All operations are scoped to the authenticated user's id — the mobile
client never supplies a user_id.

Static preferences (one user_preferences row per user, created lazily
with safe defaults):
    currency       (allowlist: INR — the only applicable currency)
    date_format    (allowlist: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
    start_of_week  (allowlist: monday, sunday)
    app_language   (allowlist: en — English only for now)

Dynamic notification data is NOT persisted here. Counts are derived at
read time from the user's real activity rows because no notification,
settlement, or invitation tables exist yet:
    expense_updates      = EXPENSE activity events
    settlement_reminders = SETTLEMENT activity events
    group_invitations    = MEMBER (invitation/member) events
When a dedicated notification system lands, only
get_notification_counts needs to change — the API contract stays.
"""

from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import write_transaction
from backend.models.activity import Activity, ActivityType
from backend.models.user_preference import UserPreference


DEFAULT_CURRENCY = "INR"
DEFAULT_DATE_FORMAT = "DD/MM/YYYY"
DEFAULT_START_OF_WEEK = "monday"
DEFAULT_APP_LANGUAGE = "en"
DEFAULT_DISPLAY_NAME = "account_name"


class PreferencesService:
    """Read/update static preferences + derive notification counts."""

    @staticmethod
    async def get_or_create(
        db: AsyncSession,
        user_id: UUID,
    ) -> UserPreference:
        """
        Return the user's preference row, creating it with safe
        defaults when this is the first access. New users therefore
        always see INR / DD/MM/YYYY / monday / en, never nulls.

        The SELECT and the INSERT share ONE write_transaction:

            BEGIN -> SELECT -> (INSERT if missing) -> COMMIT

        Previously the SELECT ran first and autobegan a transaction, so
        the following transaction() refused to own it and the lazy
        INSERT was silently rolled back — the row was never created and
        every read repeated the wasted INSERT. write_transaction()
        commits the session's current transaction, which also makes the
        lazy create correct on the authenticated read route, where the
        session is shared with the auth lookup and its transaction is
        already open.
        """
        async with write_transaction(db):
            existing = await db.scalar(
                select(UserPreference).where(
                    UserPreference.user_id == user_id
                )
            )
            if existing is not None:
                return existing

            prefs = UserPreference(
                user_id=user_id,
                currency=DEFAULT_CURRENCY,
                date_format=DEFAULT_DATE_FORMAT,
                start_of_week=DEFAULT_START_OF_WEEK,
                app_language=DEFAULT_APP_LANGUAGE,
                display_name=DEFAULT_DISPLAY_NAME,
            )
            db.add(prefs)
            await db.flush()
            return prefs

    @staticmethod
    async def update_preferences(
        db: AsyncSession,
        user_id: UUID,
        *,
        currency: Optional[str] = None,
        date_format: Optional[str] = None,
        start_of_week: Optional[str] = None,
        app_language: Optional[str] = None,
        display_name: Optional[str] = None,
    ) -> UserPreference:
        """
        Partial update: only supplied (non-None) fields change.

        Request-schema Literals already reject disallowed values with
        422; this layer re-checks defensively so direct service callers
        get the same guarantees (ValueError on violation).
        """
        prefs = await PreferencesService.get_or_create(db, user_id)

        updates: dict[str, Any] = {}
        if currency is not None:
            if currency != DEFAULT_CURRENCY:
                raise ValueError(
                    "Unsupported currency. Only INR is available."
                )
            updates["currency"] = currency
        if date_format is not None:
            if date_format not in (
                "DD/MM/YYYY",
                "MM/DD/YYYY",
                "YYYY-MM-DD",
            ):
                raise ValueError("Unsupported date format.")
            updates["date_format"] = date_format
        if start_of_week is not None:
            if start_of_week not in ("monday", "sunday"):
                raise ValueError("Unsupported start of week.")
            updates["start_of_week"] = start_of_week
        if app_language is not None:
            if app_language != DEFAULT_APP_LANGUAGE:
                raise ValueError(
                    "Unsupported language. Only English (en) is available."
                )
            updates["app_language"] = app_language
        if display_name is not None:
            if display_name not in ("account_name", "username"):
                raise ValueError(
                    "Unsupported display name. Use account_name or username."
                )
            updates["display_name"] = display_name

        if updates:
            async with write_transaction(db):
                for field, value in updates.items():
                    setattr(prefs, field, value)
                await db.flush()
        return prefs

    @staticmethod
    async def get_notification_counts(
        db: AsyncSession,
        user_id: UUID,
    ) -> dict[str, int]:
        """
        Count the user's real activity events per notification kind.

        ONE grouped query instead of three sequential COUNT round trips.
        On a ~185 ms link that removes roughly 370 ms from every
        notification-counts request. The returned shape is unchanged and
        every kind is always present, including zero counts.
        """
        kinds = (
            ActivityType.EXPENSE,
            ActivityType.SETTLEMENT,
            ActivityType.MEMBER,
        )
        counts: dict[str, int] = {
            "expense_updates": 0,
            "settlement_reminders": 0,
            "group_invitations": 0,
        }
        kind_to_field = {
            ActivityType.EXPENSE: "expense_updates",
            ActivityType.SETTLEMENT: "settlement_reminders",
            ActivityType.MEMBER: "group_invitations",
        }

        rows = await db.execute(
            select(Activity.type, func.count())
            .where(
                Activity.user_id == user_id,
                Activity.type.in_(kinds),
            )
            .group_by(Activity.type)
        )
        for kind, value in rows:
            field = kind_to_field.get(ActivityType(kind))
            if field is not None:
                counts[field] = int(value or 0)

        return counts
