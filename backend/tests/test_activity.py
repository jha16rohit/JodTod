"""
Tests for the activity feed: model, service filters, and schemas.

Uses the scratch database via the shared `db` fixture, following the
conventions in test_services.py. Rows created here are removed by the
module-scoped cleanup fixture so other test modules are unaffected.
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import delete

from backend.core.security import hash_token
from backend.models.activity import Activity, ActivityType
from backend.models.user import AccountStatus, User
from backend.schemas.activity import (
    ActivityCreate,
    ActivityListResponse,
    ActivityResponse,
)
from backend.services.activity_service import (
    ActivityService,
    InvalidActivityFilterError,
)


@pytest_asyncio.fixture
async def activity_user(db):
    user = User(
        name="Activity User",
        email="activity@example.com",
        phone=None,
        password_hash=hash_token("x"),
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    yield user
    await db.execute(
        delete(Activity).where(Activity.user_id == user.id)
    )
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()


async def _create(db, user, **kwargs):
    defaults = {
        "type": ActivityType.EXPENSE,
        "title": "Demo expense",
        "subtitle": None,
        "amount": None,
        "occurred_at": None,
        "member_key": None,
        "group_name": None,
    }
    defaults.update(kwargs)
    payload = ActivityCreate(**defaults)
    return await ActivityService.create_activity(db, user.id, payload)


def _hours_ago(hours: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=hours)


async def test_create_activity_persists_row(db, activity_user):
    activity = await _create(
        db,
        activity_user,
        title="Dinner",
        amount="₹2,850",
        member_key="neha",
        group_name="Goa Trip",
    )

    assert activity.id is not None
    assert activity.user_id == activity_user.id
    assert activity.type == ActivityType.EXPENSE
    assert activity.occurred_at is not None
    assert activity.created_at is not None


async def test_list_returns_newest_first(db, activity_user):
    await _create(db, activity_user, title="Older", occurred_at=_hours_ago(5))
    await _create(db, activity_user, title="Newer", occurred_at=_hours_ago(1))

    items = await ActivityService.list_activities(db, activity_user.id)

    assert [i.title for i in items] == ["Newer", "Older"]


async def test_type_filter(db, activity_user):
    await _create(db, activity_user, type=ActivityType.EXPENSE, title="E")
    await _create(db, activity_user, type=ActivityType.SETTLEMENT, title="S")
    await _create(db, activity_user, type=ActivityType.MEMBER, title="M")

    for activity_type, expected in (
        ("expense", ["E"]),
        ("settlement", ["S"]),
        ("member", ["M"]),
        ("all", ["M", "S", "E"]),
    ):
        items = await ActivityService.list_activities(
            db, activity_user.id, type_filter=activity_type
        )
        assert [i.title for i in items] == expected


async def test_member_filter(db, activity_user):
    await _create(db, activity_user, title="Neha item", member_key="neha")
    await _create(db, activity_user, title="Plain item")

    items = await ActivityService.list_activities(
        db, activity_user.id, member="neha"
    )
    assert [i.title for i in items] == ["Neha item"]

    items = await ActivityService.list_activities(
        db, activity_user.id, member="all"
    )
    assert len(items) == 2


async def test_date_range_filters(db, activity_user):
    now = datetime.now(timezone.utc)
    await _create(db, activity_user, title="Today", occurred_at=now)
    await _create(
        db, activity_user, title="Old", occurred_at=now - timedelta(days=40)
    )

    today = await ActivityService.list_activities(
        db, activity_user.id, date_range="today", now=now
    )
    assert [i.title for i in today] == ["Today"]

    week = await ActivityService.list_activities(
        db, activity_user.id, date_range="week", now=now
    )
    assert [i.title for i in week] == ["Today"]

    month = await ActivityService.list_activities(
        db, activity_user.id, date_range="month", now=now
    )
    assert [i.title for i in month] == ["Today"]

    everything = await ActivityService.list_activities(
        db, activity_user.id, date_range="all", now=now
    )
    assert len(everything) == 2


async def test_group_filter(db, activity_user):
    await _create(db, activity_user, title="Goa item", group_name="Goa Trip")
    await _create(db, activity_user, title="Other item", group_name="Flatmates")
    await _create(db, activity_user, title="No group item")

    items = await ActivityService.list_activities(
        db, activity_user.id, group="Goa Trip"
    )
    assert [i.title for i in items] == ["Goa item"]

    items = await ActivityService.list_activities(
        db, activity_user.id, group="all"
    )
    assert len(items) == 3


async def test_member_multi_select_uses_or(db, activity_user):
    await _create(db, activity_user, title="Neha item", member_key="neha")
    await _create(db, activity_user, title="Aman item", member_key="aman")
    await _create(db, activity_user, title="Plain item")

    items = await ActivityService.list_activities(
        db, activity_user.id, member=["neha", "aman"]
    )
    assert sorted(i.title for i in items) == ["Aman item", "Neha item"]

    items = await ActivityService.list_activities(
        db, activity_user.id, member=[]
    )
    assert len(items) == 3


async def test_group_multi_select_uses_or(db, activity_user):
    await _create(db, activity_user, title="Goa item", group_name="Goa Trip")
    await _create(
        db, activity_user, title="Flat item", group_name="Flatmates"
    )
    await _create(db, activity_user, title="No group item")

    items = await ActivityService.list_activities(
        db, activity_user.id, group=["Goa Trip", "Flatmates"]
    )
    assert sorted(i.title for i in items) == ["Flat item", "Goa item"]

    items = await ActivityService.list_activities(
        db, activity_user.id, group=[]
    )
    assert len(items) == 3


async def test_member_group_multi_select_combine_with_and(db, activity_user):
    await _create(
        db,
        activity_user,
        title="Match",
        member_key="neha",
        group_name="Goa Trip",
    )
    await _create(
        db,
        activity_user,
        title="Wrong member",
        member_key="aman",
        group_name="Flatmates",
    )
    await _create(
        db,
        activity_user,
        title="Wrong group",
        member_key="neha",
        group_name="Flatmates",
    )

    items = await ActivityService.list_activities(
        db,
        activity_user.id,
        member=["neha", "aman"],
        group=["Goa Trip"],
    )
    assert [i.title for i in items] == ["Match"]


async def test_custom_range_is_inclusive(db, activity_user):
    await _create(
        db,
        activity_user,
        title="Start edge",
        occurred_at=datetime(2026, 9, 20, 0, 0, tzinfo=timezone.utc),
    )
    await _create(
        db,
        activity_user,
        title="Middle",
        occurred_at=datetime(2026, 9, 22, 15, 30, tzinfo=timezone.utc),
    )
    await _create(
        db,
        activity_user,
        title="End edge",
        occurred_at=datetime(2026, 9, 25, 23, 59, tzinfo=timezone.utc),
    )
    await _create(
        db,
        activity_user,
        title="Outside",
        occurred_at=datetime(2026, 9, 26, 0, 0, tzinfo=timezone.utc),
    )

    items = await ActivityService.list_activities(
        db,
        activity_user.id,
        date_range="custom",
        start_date="2026-09-20",
        end_date="2026-09-25",
    )
    assert [i.title for i in items] == ["End edge", "Middle", "Start edge"]


async def test_custom_range_validation(db, activity_user):
    with pytest.raises(InvalidActivityFilterError):
        await ActivityService.list_activities(
            db, activity_user.id, date_range="custom"
        )
    with pytest.raises(InvalidActivityFilterError):
        await ActivityService.list_activities(
            db,
            activity_user.id,
            date_range="custom",
            start_date="2026-09-25",
            end_date="2026-09-20",
        )
    with pytest.raises(InvalidActivityFilterError):
        await ActivityService.list_activities(
            db,
            activity_user.id,
            date_range="custom",
            start_date="not-a-date",
            end_date="2026-09-20",
        )


async def test_combined_filters(db, activity_user):
    await _create(
        db,
        activity_user,
        type=ActivityType.EXPENSE,
        title="Match",
        member_key="neha",
        group_name="Goa Trip",
        occurred_at=datetime.now(timezone.utc),
    )
    await _create(
        db,
        activity_user,
        type=ActivityType.EXPENSE,
        title="Wrong member",
        member_key="aman",
        group_name="Goa Trip",
        occurred_at=datetime.now(timezone.utc),
    )
    await _create(
        db,
        activity_user,
        type=ActivityType.SETTLEMENT,
        title="Wrong type",
        member_key="neha",
        group_name="Goa Trip",
        occurred_at=datetime.now(timezone.utc),
    )

    items = await ActivityService.list_activities(
        db,
        activity_user.id,
        type_filter="expense",
        member="neha",
        group="Goa Trip",
        date_range="week",
    )
    assert [i.title for i in items] == ["Match"]


async def test_get_activity_returns_owned_record(db, activity_user):
    created = await _create(
        db,
        activity_user,
        type=ActivityType.SETTLEMENT,
        title="Settled",
        actor_name="Aman",
        counterparty_name="Rohit",
        status="Completed",
        description="UPI payment",
        participants=[{"name": "Aman", "share": "₹100", "avatar": None}],
    )

    fetched = await ActivityService.get_activity(db, activity_user.id, created.id)

    assert fetched is not None
    assert fetched.title == "Settled"
    assert fetched.actor_name == "Aman"
    assert fetched.counterparty_name == "Rohit"
    assert fetched.status == "Completed"
    assert fetched.participants == [
        {"name": "Aman", "share": "₹100", "avatar": None}
    ]


async def test_get_activity_hidden_from_other_user(db, activity_user):
    created = await _create(db, activity_user, title="Private")

    assert (
        await ActivityService.get_activity(
            db, uuid4(), created.id
        )
    ) is None


async def test_search_matches_actor_and_description(db, activity_user):
    await _create(
        db,
        activity_user,
        title="Dinner",
        actor_name="Rohit Sharma",
        description="Beach shack feast",
        counterparty_name="Neha Verma",
    )
    await _create(db, activity_user, title="Taxi")

    by_actor = await ActivityService.list_activities(
        db, activity_user.id, search="sharma"
    )
    assert [i.title for i in by_actor] == ["Dinner"]

    by_description = await ActivityService.list_activities(
        db, activity_user.id, search="FEAST"
    )
    assert [i.title for i in by_description] == ["Dinner"]

    by_counterparty = await ActivityService.list_activities(
        db, activity_user.id, search="verma"
    )
    assert [i.title for i in by_counterparty] == ["Dinner"]


async def test_search_matches_title_subtitle_member_group(db, activity_user):
    await _create(
        db,
        activity_user,
        title="Dinner at Bruno's",
        subtitle="Beach shack feast",
        member_key="neha",
        group_name="Goa Trip",
    )
    await _create(
        db,
        activity_user,
        title="Taxi receipt",
        subtitle="Airport run",
        member_key="aman",
        group_name="Flatmates",
    )

    by_title = await ActivityService.list_activities(
        db, activity_user.id, search="bruno"
    )
    assert [i.title for i in by_title] == ["Dinner at Bruno's"]

    by_description = await ActivityService.list_activities(
        db, activity_user.id, search="FEAST"
    )
    assert [i.title for i in by_description] == ["Dinner at Bruno's"]

    by_member = await ActivityService.list_activities(
        db, activity_user.id, search="NeHa"
    )
    assert [i.title for i in by_member] == ["Dinner at Bruno's"]

    by_group = await ActivityService.list_activities(
        db, activity_user.id, search="goa trip"
    )
    assert [i.title for i in by_group] == ["Dinner at Bruno's"]

    partial = await ActivityService.list_activities(
        db, activity_user.id, search="ecei"
    )
    assert [i.title for i in partial] == ["Taxi receipt"]


async def test_search_blank_returns_everything(db, activity_user):
    await _create(db, activity_user, title="One")
    await _create(db, activity_user, title="Two")

    for blank in (None, "", "   "):
        items = await ActivityService.list_activities(
            db, activity_user.id, search=blank
        )
        assert len(items) == 2


async def test_search_combines_with_filters(db, activity_user):
    await _create(
        db,
        activity_user,
        type=ActivityType.EXPENSE,
        title="Goa dinner",
        group_name="Goa Trip",
    )
    await _create(
        db,
        activity_user,
        type=ActivityType.SETTLEMENT,
        title="Goa settlement",
        group_name="Goa Trip",
    )

    items = await ActivityService.list_activities(
        db, activity_user.id, type_filter="expense", search="goa"
    )
    assert [i.title for i in items] == ["Goa dinner"]


async def test_search_escapes_like_wildcards(db, activity_user):
    await _create(db, activity_user, title="100% legit")
    await _create(db, activity_user, title="Something else")

    items = await ActivityService.list_activities(
        db, activity_user.id, search="100%"
    )
    assert [i.title for i in items] == ["100% legit"]


async def test_invalid_filters_raise(db, activity_user):
    with pytest.raises(InvalidActivityFilterError):
        await ActivityService.list_activities(
            db, activity_user.id, type_filter="bogus"
        )
    with pytest.raises(InvalidActivityFilterError):
        await ActivityService.list_activities(
            db, activity_user.id, date_range="bogus"
        )


async def test_list_is_scoped_to_user(db, activity_user):
    other = User(
        name="Other",
        email="other-activity@example.com",
        phone=None,
        password_hash=hash_token("x"),
        account_status=AccountStatus.ACTIVE,
        email_verified=False,
        phone_verified=False,
    )
    db.add(other)
    await db.flush()
    try:
        await _create(db, other, title="Other item")
        items = await ActivityService.list_activities(db, activity_user.id)
        assert items == []
    finally:
        await db.execute(
            delete(Activity).where(Activity.user_id == other.id)
        )
        await db.execute(delete(User).where(User.id == other.id))
        await db.commit()


def test_activity_response_schema():
    payload = ActivityResponse(
        id="12345678-1234-5678-1234-567812345678",
        type="expense",
        title="Dinner",
        subtitle=None,
        amount="₹2,850",
        occurred_at=datetime(2026, 9, 20, 12, 0, tzinfo=timezone.utc),
        member_key=None,
        group_name="Goa Trip",
        created_at=datetime(2026, 9, 20, 12, 0, tzinfo=timezone.utc),
    )
    assert payload.title == "Dinner"

    envelope = ActivityListResponse(items=[payload])
    assert len(envelope.items) == 1
