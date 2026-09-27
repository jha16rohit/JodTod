"""
Tests for group updates (PATCH /api/groups/{id}) and domain-event
fan-out from groups/expenses/settlements into the activity feed.

Conventions follow test_settlements.py: the shared `db` fixture
provides a clean async session; endpoint tests drive the ASGI app
with httpx and override `get_db` so auth + handlers share the test
session. No mock/seed data: every row is created through the
services/endpoints under test with throwaway test accounts.
"""

from __future__ import annotations

from uuid import uuid4

import httpx
import pytest_asyncio
from sqlalchemy import delete, select

from backend.database import get_db
from backend.main import app
from backend.models.activity import Activity, ActivityType
from backend.models.group import Group, GroupMember
from backend.models.settlement import Settlement
from backend.models.user import AccountStatus, User
from backend.services.activity_service import ActivityService
from backend.services.expense_service import ExpenseService
from backend.services.group_service import GroupService
from backend.services.settlement_service import SettlementService


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def members(db):
    """Two active users + group ids, cleaned up after the test."""
    users = []
    for label in ("U", "V"):
        user = User(
            name=f"Upd {label}",
            email=f"upd-{label.lower()}-{uuid4().hex[:8]}@example.com",
            phone=None,
            password_hash="hash",
            account_status=AccountStatus.ACTIVE,
            email_verified=True,
            phone_verified=False,
        )
        db.add(user)
        users.append(user)
    await db.flush()
    group_ids: list = []
    yield users, group_ids
    await db.execute(
        delete(Activity).where(
            Activity.user_id.in_([u.id for u in users])
        )
    )
    await db.execute(
        delete(Settlement).where(
            Settlement.payer_user_id.in_([u.id for u in users])
            | (Settlement.receiver_user_id.in_([u.id for u in users]))
        )
    )
    await db.execute(
        delete(GroupMember).where(
            GroupMember.user_id.in_([u.id for u in users])
        )
    )
    if group_ids:
        await db.execute(delete(Group).where(Group.id.in_(group_ids)))
    await db.execute(delete(User).where(User.id.in_([u.id for u in users])))
    await db.commit()


async def _auth_headers(db, user) -> dict[str, str]:
    from backend.services.session_service import SessionService

    _, token_data = await SessionService.create_session(db, user)
    await db.flush()
    return {"Authorization": f"Bearer {token_data['access_token']}"}


def _asgi_client(db):
    async def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    )


def _clear_overrides():
    app.dependency_overrides.pop(get_db, None)


async def _group(db, creator, others=(), name="Update Trip", group_ids=None):
    group = await GroupService.create_group(
        db,
        creator_id=creator.id,
        name=name,
        group_type="trip",
        member_user_ids=[u.id for u in others],
    )
    if group_ids is not None:
        group_ids.append(group.id)
    return group


async def _activities(db, user):
    return await ActivityService.list_activities(db, user.id)


# ---------------------------------------------------------------------------
# PATCH /api/groups/{id}
# ---------------------------------------------------------------------------


async def test_update_group_name_persists(db, members):
    users, group_ids = members
    group = await _group(db, users[0], [users[1]], group_ids=group_ids)

    client = _asgi_client(db)
    try:
        headers = await _auth_headers(db, users[0])
        resp = await client.patch(
            f"/api/groups/{group.id}",
            json={"name": "Renamed Trip"},
            headers=headers,
        )
    finally:
        await client.aclose()
        _clear_overrides()

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "Renamed Trip"
    assert body["id"] == str(group.id)

    # Fresh read: the change really persisted (no silent rollback).
    db.expire_all()
    fresh = await db.get(Group, group.id)
    assert fresh is not None and fresh.name == "Renamed Trip"


async def test_update_group_description_and_type(db, members):
    users, group_ids = members
    group = await _group(db, users[0], group_ids=group_ids)

    client = _asgi_client(db)
    try:
        headers = await _auth_headers(db, users[0])
        resp = await client.patch(
            f"/api/groups/{group.id}",
            json={"description": "Beach week", "group_type": "friends"},
            headers=headers,
        )
    finally:
        await client.aclose()
        _clear_overrides()

    assert resp.status_code == 200, resp.text
    assert resp.json()["description"] == "Beach week"
    db.expire_all()
    fresh = await db.get(Group, group.id)
    assert fresh is not None
    assert fresh.description == "Beach week"
    assert fresh.group_type.value == "friends"


async def test_update_group_emits_activity(db, members):
    users, group_ids = members
    group = await _group(db, users[0], [users[1]], group_ids=group_ids)
    before = await _activities(db, users[1])

    client = _asgi_client(db)
    try:
        headers = await _auth_headers(db, users[0])
        resp = await client.patch(
            f"/api/groups/{group.id}",
            json={"name": "Another Name"},
            headers=headers,
        )
    finally:
        await client.aclose()
        _clear_overrides()

    assert resp.status_code == 200, resp.text
    after = await _activities(db, users[1])
    assert len(after) == len(before) + 1
    assert after[0].type == ActivityType.GROUP
    assert "updated" in (after[0].status or "")


async def test_update_group_non_member_404(db, members):
    users, group_ids = members
    group = await _group(db, users[0], group_ids=group_ids)

    client = _asgi_client(db)
    try:
        headers = await _auth_headers(db, users[1])
        resp = await client.patch(
            f"/api/groups/{group.id}",
            json={"name": "Hijack"},
            headers=headers,
        )
    finally:
        await client.aclose()
        _clear_overrides()

    assert resp.status_code == 404


async def test_update_group_non_admin_403(db, members):
    users, group_ids = members
    group = await _group(db, users[0], [users[1]], group_ids=group_ids)

    client = _asgi_client(db)
    try:
        headers = await _auth_headers(db, users[1])
        resp = await client.patch(
            f"/api/groups/{group.id}",
            json={"name": "Hijack"},
            headers=headers,
        )
    finally:
        await client.aclose()
        _clear_overrides()

    assert resp.status_code == 403


async def test_update_group_empty_payload_422(db, members):
    users, group_ids = members
    group = await _group(db, users[0], group_ids=group_ids)

    client = _asgi_client(db)
    try:
        headers = await _auth_headers(db, users[0])
        resp = await client.patch(
            f"/api/groups/{group.id}", json={}, headers=headers
        )
    finally:
        await client.aclose()
        _clear_overrides()

    assert resp.status_code == 422


async def test_update_group_bad_type_422(db, members):
    users, group_ids = members
    group = await _group(db, users[0], group_ids=group_ids)

    client = _asgi_client(db)
    try:
        headers = await _auth_headers(db, users[0])
        resp = await client.patch(
            f"/api/groups/{group.id}",
            json={"group_type": "spaceship"},
            headers=headers,
        )
    finally:
        await client.aclose()
        _clear_overrides()

    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Activity fan-out
# ---------------------------------------------------------------------------


async def test_create_group_emits_group_activity(db, members):
    users, group_ids = members
    await _group(db, users[0], [users[1]], group_ids=group_ids)

    for user in users:
        items = await _activities(db, user)
        assert items, "group creation must emit a feed event"
        assert items[0].type == ActivityType.GROUP
        assert "Update Trip" in items[0].title


async def test_join_by_code_emits_member_activity(db, members):
    users, group_ids = members
    group = await _group(db, users[0], group_ids=group_ids)

    joined = await GroupService.join_by_code(
        db, users[1].id, group.invite_code
    )
    group_ids.append(joined.id)

    items = await _activities(db, users[0])
    assert items[0].type == ActivityType.MEMBER
    assert "joined" in items[0].title


async def test_create_expense_emits_expense_activity(db, members):
    users, group_ids = members
    group = await _group(db, users[0], [users[1]], group_ids=group_ids)

    await ExpenseService.create_expense(
        db,
        creator_id=users[0].id,
        group_id=group.id,
        title="Dinner",
        amount="1200.00",
        payer_user_id=users[0].id,
    )

    for user in users:
        items = await _activities(db, user)
        assert items[0].type == ActivityType.EXPENSE
        assert items[0].title == "Dinner"
        assert items[0].amount == "₹1200.00"
        assert items[0].group_name == "Update Trip"


async def test_settlement_flow_emits_settlement_activities(db, members):
    users, group_ids = members
    group = await _group(db, users[0], [users[1]], group_ids=group_ids)
    await ExpenseService.create_expense(
        db,
        creator_id=users[0].id,
        group_id=group.id,
        title="Dinner",
        amount="1000.00",
        payer_user_id=users[0].id,
    )

    row = await SettlementService.initiate(
        db,
        payer_id=users[1].id,
        group_id=group.id,
        receiver_id=users[0].id,
        amount="500.00",
    )
    pending = await _activities(db, users[0])
    assert pending[0].type == ActivityType.SETTLEMENT
    assert pending[0].status == "pending"

    await SettlementService.confirm(db, users[0].id, row.id)
    paid = await _activities(db, users[1])
    assert paid[0].type == ActivityType.SETTLEMENT
    assert paid[0].status == "paid"


async def test_group_detail_returns_real_roles(db, members):
    users, group_ids = members
    group = await _group(db, users[0], [users[1]], group_ids=group_ids)

    client = _asgi_client(db)
    try:
        headers = await _auth_headers(db, users[0])
        resp = await client.get(f"/api/groups/{group.id}", headers=headers)
    finally:
        await client.aclose()
        _clear_overrides()

    assert resp.status_code == 200, resp.text
    roles = {
        m["user_id"]: m["role"] for m in resp.json()["members"]
    }
    assert roles[str(users[0].id)] == "admin"
    assert roles[str(users[1].id)] == "member"
