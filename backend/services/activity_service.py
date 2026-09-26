# backend/services/activity_service.py

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.activity import Activity, ActivityType
from backend.schemas.activity import ActivityCreate
from backend.database import transaction


class InvalidActivityFilterError(Exception):
    """Raised when an activity list filter value is not supported."""


VALID_TYPES = ("all", "expense", "settlement", "member", "group")
VALID_DATE_RANGES = ("all", "today", "week", "month", "custom")


class ActivityService:
    """
    User-scoped activity event storage and filtered listing.

    Every query is scoped to the authenticated user. Results are
    newest-first by occurred_at so the mobile client can group them
    into Today / Yesterday / older-date sections.
    """

    @staticmethod
    def utc_now() -> datetime:
        return datetime.now(timezone.utc)

    # ============================================================
    # CREATE
    # ============================================================

    @staticmethod
    async def create_activity(
        db: AsyncSession,
        user_id: UUID,
        payload: ActivityCreate,
    ) -> Activity:
        """
        Record one activity event for the given user.
        """
        activity = Activity(
            user_id=user_id,
            type=payload.type,
            title=payload.title,
            subtitle=payload.subtitle,
            amount=payload.amount,
            occurred_at=payload.occurred_at or ActivityService.utc_now(),
            member_key=payload.member_key,
            group_name=payload.group_name,
            actor_name=payload.actor_name,
            actor_avatar=payload.actor_avatar,
            counterparty_name=payload.counterparty_name,
            counterparty_avatar=payload.counterparty_avatar,
            counterparty_sub=payload.counterparty_sub,
            category=payload.category,
            status=payload.status,
            description=payload.description,
            split_type=payload.split_type,
            split_among=payload.split_among,
            each_share=payload.each_share,
            bill_image=payload.bill_image,
            participants=(
                [p.model_dump() for p in payload.participants]
                if payload.participants is not None
                else None
            ),
        )
        # get_db never commits; writes must be committed explicitly
        # (same transaction() pattern as every other service).
        async with transaction(db):
            db.add(activity)
            await db.flush()
        return activity

    # ============================================================
    # LIST WITH FILTERS
    # ============================================================

    @staticmethod
    def _date_cutoff(date_range: str, now: datetime) -> datetime | None:
        if date_range == "all":
            return None
        if date_range == "today":
            return now.replace(hour=0, minute=0, second=0, microsecond=0)
        if date_range == "week":
            return now - timedelta(days=7)
        if date_range == "month":
            return now - timedelta(days=30)
        raise InvalidActivityFilterError(
            f"Unsupported date_range: {date_range}"
        )

    @staticmethod
    def _parse_custom_day(value: str, field: str) -> datetime:
        """
        Parse a YYYY-MM-DD custom range boundary into an aware UTC datetime.

        Returns midnight UTC of the given calendar day. Raises
        InvalidActivityFilterError for malformed input.
        """
        try:
            parsed = datetime.strptime(value, "%Y-%m-%d")
        except (TypeError, ValueError):
            raise InvalidActivityFilterError(
                f"Invalid {field}; expected YYYY-MM-DD."
            ) from None
        return parsed.replace(tzinfo=timezone.utc)

    @staticmethod
    def _search_pattern(raw: str) -> str:
        """
        Build a LIKE pattern for partial matching.

        Backslash, % and _ are escaped so user input is always
        treated literally.
        """
        escaped = (
            raw.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        return f"%{escaped}%"

    @staticmethod
    def _normalize_multi(value: str | list[str]) -> list[str] | None:
        """
        Normalize a single- or multi-select filter to a value list.

        Returns None when the filter is disabled ("all", empty, or
        blank), otherwise the selected values matched with OR
        semantics. Plain strings keep working for single selection.
        """
        raw = [value] if isinstance(value, str) else list(value or [])
        cleaned = [v for v in (str(v).strip() for v in raw) if v and v != "all"]
        return cleaned or None

    @staticmethod
    async def list_activities(
        db: AsyncSession,
        user_id: UUID,
        type_filter: str = "all",
        member: str | list[str] = "all",
        group: str | list[str] = "all",
        date_range: str = "all",
        start_date: str | None = None,
        end_date: str | None = None,
        search: str | None = None,
        now: datetime | None = None,
    ) -> list[Activity]:
        """
        List the user's activities, newest first.

        type_filter: one of all|expense|settlement|member|group
        member: "all"/[] disables; otherwise a member key or list of
            keys matched with OR semantics
        group: "all"/[] disables; otherwise a group name or list of
            names matched with OR semantics
        date_range: one of all|today|week|month|custom (UTC windows).
            custom requires start_date/end_date (YYYY-MM-DD) and is
            inclusive on both boundary days.
        search: blank/None disables text search; otherwise
            case-insensitive partial match across title, subtitle,
            description, member_key, actor/counterparty names and
            group_name.
        """
        if type_filter not in VALID_TYPES:
            raise InvalidActivityFilterError(
                f"Unsupported type filter: {type_filter}"
            )
        if date_range not in VALID_DATE_RANGES:
            raise InvalidActivityFilterError(
                f"Unsupported date_range: {date_range}"
            )

        current = now or ActivityService.utc_now()
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)

        stmt = select(Activity).where(Activity.user_id == user_id)

        if type_filter != "all":
            stmt = stmt.where(
                Activity.type == ActivityType(type_filter)
            )

        member_keys = ActivityService._normalize_multi(member)
        if member_keys is not None:
            stmt = stmt.where(Activity.member_key.in_(member_keys))

        group_names = ActivityService._normalize_multi(group)
        if group_names is not None:
            stmt = stmt.where(Activity.group_name.in_(group_names))

        if search is not None and search.strip() != "":
            pattern = ActivityService._search_pattern(search.strip())
            stmt = stmt.where(
                or_(
                    Activity.title.ilike(pattern, escape="\\"),
                    Activity.subtitle.ilike(pattern, escape="\\"),
                    Activity.description.ilike(pattern, escape="\\"),
                    Activity.member_key.ilike(pattern, escape="\\"),
                    Activity.actor_name.ilike(pattern, escape="\\"),
                    Activity.counterparty_name.ilike(pattern, escape="\\"),
                    Activity.group_name.ilike(pattern, escape="\\"),
                )
            )

        if date_range == "custom":
            if not start_date or not end_date:
                raise InvalidActivityFilterError(
                    "Custom date_range requires start_date and end_date."
                )
            start_day = ActivityService._parse_custom_day(
                start_date, "start_date"
            )
            end_day = ActivityService._parse_custom_day(
                end_date, "end_date"
            )
            if start_day > end_day:
                raise InvalidActivityFilterError(
                    "start_date must not be after end_date."
                )
            # Inclusive on both boundary days: [start 00:00, end+1 00:00).
            stmt = stmt.where(Activity.occurred_at >= start_day)
            stmt = stmt.where(
                Activity.occurred_at
                < end_day + timedelta(days=1)
            )
        else:
            cutoff = ActivityService._date_cutoff(date_range, current)
            if cutoff is not None:
                stmt = stmt.where(Activity.occurred_at >= cutoff)

        stmt = stmt.order_by(
            Activity.occurred_at.desc(),
            Activity.created_at.desc(),
        )

        result = await db.execute(stmt)
        return list(result.scalars().all())

    # ============================================================
    # GET BY ID (user-scoped detail retrieval)
    # ============================================================

    @staticmethod
    async def get_activity(
        db: AsyncSession,
        user_id: UUID,
        activity_id: UUID,
    ) -> Activity | None:
        """
        Return one activity owned by the user, or None when missing
        or owned by someone else (callers map None to 404 without
        revealing ownership).
        """
        result = await db.execute(
            select(Activity).where(
                Activity.id == activity_id,
                Activity.user_id == user_id,
            )
        )
        return result.scalars().first()
