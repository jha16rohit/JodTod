"""
Tests for People & Settlements: groups, expenses, balances, settlement
workflow, history, suggestions, and authorization.

Conventions follow the existing suite: the shared `db` fixture provides
a clean async session; endpoint tests drive the ASGI app with httpx and
override `get_db` so auth + handlers share the test session.

No mock/seed data: every row is created through the services/endpoints
under test with throwaway test accounts.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import httpx
import pytest_asyncio
from sqlalchemy import delete, select

from backend.database import get_db
from backend.main import app
from backend.models.expense import Expense, ExpenseSplit
from backend.models.group import Group, GroupMember
from backend.models.group_invitation import GroupInvitation
from backend.models.settlement import Settlement, SettlementStatus
from backend.models.user import AccountStatus, User
from backend.services.expense_service import ExpenseService
from backend.services.group_service import GroupService
from backend.services.settlement_service import SettlementService


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def members(db):
    """Three active users + their groups, cleaned up after the test."""
    users = []
    for i, label in enumerate(("A", "B", "C")):
        user = User(
            name=f"Settle {label}",
            email=f"settle-{label.lower()}-{uuid4().hex[:8]}@example.com",
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
        delete(Settlement).where(
            Settlement.payer_user_id.in_([u.id for u in users])
            | (Settlement.receiver_user_id.in_([u.id for u in users]))
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


async def _group(db, creator, others=(), name="Trip", group_ids=None):
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


async def _expense(db, creator, group, payer, amount, participants=None):
    return await ExpenseService.create_expense(
        db,
        creator_id=creator.id,
        group_id=group.id,
        title="Dinner",
        amount=amount,
        payer_user_id=payer.id,
        participant_ids=(
            [u.id for u in participants] if participants else None
        ),
    )


# ---------------------------------------------------------------------------
# People listing + filters + search + scoping
# ---------------------------------------------------------------------------


async def test_people_requires_auth(db, members):
    async with _asgi_client(db) as client:
        response = await client.get("/api/settlements/people")
    assert response.status_code == 401
    _clear_overrides()


async def test_people_empty_state(db, members):
    users, _ = members
    headers = await _auth_headers(db, users[0])
    async with _asgi_client(db) as client:
        response = await client.get(
            "/api/settlements/people", headers=headers
        )
    assert response.status_code == 200
    assert response.json() == {"people": [], "total": 0}
    _clear_overrides()


async def test_people_lists_only_nonzero_shared(db, members):
    users, group_ids = members
    me, aman, stranger = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    # Aman paid 1000 split equally with me -> I owe Aman 500.
    await _expense(db, me, group, aman, "1000.00")
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        response = await client.get(
            "/api/settlements/people", headers=headers
        )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    person = body["people"][0]
    assert person["display_name"] == "Settle B"
    assert person["direction"] == "YOU_OWE"
    assert person["you_owe"] == "500.00"
    assert person["they_owe"] == "0.00"
    assert person["net_balance"] == "-500.00"
    assert person["common_group_count"] == 1
    assert person["user_id"] == str(aman.id)
    # Stranger (no shared group) never appears.
    assert all(p["user_id"] != str(stranger.id) for p in body["people"])
    _clear_overrides()


async def test_people_filters_you_owe_they_owe(db, members):
    users, group_ids = members
    me, debtor, creditor = users
    group = await _group(db, me, [debtor, creditor], group_ids=group_ids)
    # I pay 900 for all three -> each owes me 300.
    await _expense(db, me, group, me, "900.00")
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        all_people = await client.get(
            "/api/settlements/people", headers=headers
        )
        you_owe = await client.get(
            "/api/settlements/people?direction=you_owe", headers=headers
        )
        they_owe = await client.get(
            "/api/settlements/people?direction=they_owe", headers=headers
        )
    assert all_people.json()["total"] == 2
    assert you_owe.json() == {"people": [], "total": 0}
    names = {p["display_name"] for p in they_owe.json()["people"]}
    assert names == {"Settle B", "Settle C"}
    for person in they_owe.json()["people"]:
        assert person["direction"] == "THEY_OWE"
        assert person["they_owe"] == "300.00"
        assert person["net_balance"] == "300.00"
    _clear_overrides()


async def test_people_search_scoped_to_shared(db, members):
    users, group_ids = members
    me, aman, outsider = users
    outsider.name = "Settle Outsider"
    await _group(db, me, [aman], group_ids=group_ids)
    group2 = await _group(db, me, [], name="Other", group_ids=group_ids)
    assert group2 is not None
    await _expense(
        db, me, (await db.get(Group, group_ids[0])), aman, "600.00"
    )
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        hit = await client.get(
            "/api/settlements/people?q=settle%20b", headers=headers
        )
        miss = await client.get(
            "/api/settlements/people?q=outsider", headers=headers
        )
    assert hit.json()["total"] == 1
    # Search cannot enumerate unrelated accounts.
    assert miss.json() == {"people": [], "total": 0}
    _clear_overrides()


async def test_person_detail_active_groups_only(db, members):
    users, group_ids = members
    me, aman, _ = users
    goa = await _group(db, me, [aman], name="Goa", group_ids=group_ids)
    manali = await _group(
        db, me, [aman], name="Manali", group_ids=group_ids
    )
    await _expense(db, me, goa, aman, "1360.00")  # I owe 680
    await _expense(db, me, manali, aman, "1140.00")  # I owe 570
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        response = await client.get(
            f"/api/settlements/people/{aman.id}", headers=headers
        )
    assert response.status_code == 200
    body = response.json()
    assert body["you_owe"] == "1250.00"
    assert body["they_owe"] == "0.00"
    assert body["net_balance"] == "-1250.00"
    assert body["direction"] == "YOU_OWE"
    assert [g["name"] for g in body["groups"]] == ["Goa", "Manali"]
    assert body["groups"][0]["you_owe"] == "680.00"
    assert body["groups"][1]["you_owe"] == "570.00"
    _clear_overrides()


async def test_settled_group_excluded_from_active(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")  # I owe 500
    me_headers = await _auth_headers(db, me)
    aman_headers = await _auth_headers(db, aman)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=me_headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "500.00",
            },
        )
        assert created.status_code == 200
        confirmed = await client.post(
            f"/api/settlements/{created.json()['id']}/confirm",
            headers=aman_headers,
        )
        assert confirmed.status_code == 200
        people = await client.get(
            "/api/settlements/people", headers=me_headers
        )
        detail = await client.get(
            f"/api/settlements/people/{aman.id}", headers=me_headers
        )
    # Fully settled: gone from the active list, empty active groups.
    assert people.json() == {"people": [], "total": 0}
    assert detail.json()["groups"] == []
    assert detail.json()["direction"] == "SETTLED"
    _clear_overrides()


# ---------------------------------------------------------------------------
# Group balances + suggestions
# ---------------------------------------------------------------------------


async def test_group_detail_balances(db, members):
    users, group_ids = members
    me, karan, neha = users
    group = await _group(
        db, me, [karan, neha], name="Goa", group_ids=group_ids
    )
    # Aman(me? no) -> me pays 2640 for all three: each owes me 880... but
    # spec example: Aman +1660, Karan -680, Neha -980. Build directly:
    # Karan pays 0, Neha pays 0; me pays 2640 split me=980? Use custom:
    from backend.services.expense_service import ExpenseService as ES

    await ES.create_expense(
        db,
        creator_id=me.id,
        group_id=group.id,
        title="Villa",
        amount="2640.00",
        payer_user_id=me.id,
        split_type="custom",
        splits=[
            {"user_id": str(me.id), "share_amount": "980.00"},
            {"user_id": str(karan.id), "share_amount": "680.00"},
            {"user_id": str(neha.id), "share_amount": "980.00"},
        ],
    )
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        response = await client.get(
            f"/api/groups/{group.id}", headers=headers
        )
    assert response.status_code == 200
    body = response.json()
    assert body["my_net"] == "1660.00"
    assert body["settlement_status"] == "pending"
    by_name = {m["display_name"]: m for m in body["members"]}
    assert by_name["Settle B"]["net_balance"] == "-680.00"
    assert by_name["Settle C"]["net_balance"] == "-980.00"
    _clear_overrides()


async def test_suggestions_minimum_transactions(db, members):
    users, group_ids = members
    me, karan, neha = users
    group = await _group(
        db, me, [karan, neha], name="Goa", group_ids=group_ids
    )
    from backend.services.expense_service import ExpenseService as ES

    await ES.create_expense(
        db,
        creator_id=me.id,
        group_id=group.id,
        title="Villa",
        amount="2640.00",
        payer_user_id=me.id,
        split_type="custom",
        splits=[
            {"user_id": str(me.id), "share_amount": "980.00"},
            {"user_id": str(karan.id), "share_amount": "680.00"},
            {"user_id": str(neha.id), "share_amount": "980.00"},
        ],
    )
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        response = await client.get(
            f"/api/groups/{group.id}/suggestions", headers=headers
        )
    assert response.status_code == 200
    suggestions = response.json()["suggestions"]
    assert len(suggestions) == 2  # minimum, not 4
    pairs = {
        (s["payer_name"], s["receiver_name"], s["amount"])
        for s in suggestions
    }
    assert pairs == {
        ("Settle B", "Settle A", "680.00"),
        ("Settle C", "Settle A", "980.00"),
    }
    # Suggested amounts exactly clear the nets.
    total = sum(Decimal(s["amount"]) for s in suggestions)
    assert total == Decimal("1660.00")
    _clear_overrides()


async def test_all_settled_group(db, members):
    users, group_ids = members
    me, other, _ = users
    group = await _group(db, me, [other], group_ids=group_ids)
    await _expense(db, me, group, me, "500.00")  # each owes me 250
    me_headers = await _auth_headers(db, me)
    other_headers = await _auth_headers(db, other)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=other_headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(me.id),
                "amount": "250.00",
            },
        )
        assert created.status_code == 200
        await client.post(
            f"/api/settlements/{created.json()['id']}/confirm",
            headers=me_headers,
        )
        detail = await client.get(
            f"/api/groups/{group.id}", headers=me_headers
        )
        suggestions = await client.get(
            f"/api/groups/{group.id}/suggestions", headers=me_headers
        )
    assert detail.json()["settlement_status"] == "settled"
    assert suggestions.json()["suggestions"] == []
    _clear_overrides()


# ---------------------------------------------------------------------------
# Settlement workflow: initiate / confirm / reject / cancel
# ---------------------------------------------------------------------------


async def test_full_payment_initiation_is_pending(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1360.00")  # I owe 680
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/settlements",
            headers=headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "680.00",
                "note": "Paid cash",
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["amount"] == "680.00"
    assert body["note"] == "Paid cash"
    assert body["confirmed_at"] is None
    # PENDING changes nothing: debt still fully active.
    assert (
        await SettlementService.outstanding(db, group.id, me.id, aman.id)
        == Decimal("680.00")
    )
    _clear_overrides()


async def test_partial_payment_leaves_remaining(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1360.00")
    me_headers = await _auth_headers(db, me)
    aman_headers = await _auth_headers(db, aman)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=me_headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "150.00",
                "payment_method": "partial_payment",
            },
        )
        assert created.status_code == 200
        assert created.json()["status"] == "pending"
        confirmed = await client.post(
            f"/api/settlements/{created.json()['id']}/confirm",
            headers=aman_headers,
        )
        assert confirmed.status_code == 200
        assert confirmed.json()["status"] == "paid"
    remaining = await SettlementService.outstanding(
        db, group.id, me.id, aman.id
    )
    assert remaining == Decimal("530.00")
    # Remaining debt still active in People + Person Detail.
    headers = me_headers
    async with _asgi_client(db) as client:
        people = await client.get(
            "/api/settlements/people", headers=headers
        )
    assert people.json()["people"][0]["you_owe"] == "530.00"
    _clear_overrides()


async def test_payer_cannot_confirm_own_payment(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "500.00",
            },
        )
        forbidden = await client.post(
            f"/api/settlements/{created.json()['id']}/confirm",
            headers=headers,
        )
    assert forbidden.status_code == 403
    _clear_overrides()


async def test_receiver_can_reject_debt_unchanged(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")
    me_headers = await _auth_headers(db, me)
    aman_headers = await _auth_headers(db, aman)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=me_headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "500.00",
            },
        )
        rejected = await client.post(
            f"/api/settlements/{created.json()['id']}/reject",
            headers=aman_headers,
            json={"reason": "Not received"},
        )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert (
        await SettlementService.outstanding(db, group.id, me.id, aman.id)
        == Decimal("500.00")
    )
    # History shows only confirmed payments: rejected excluded.
    async with _asgi_client(db) as client:
        history = await client.get(
            f"/api/settlements/groups/{group.id}/history",
            headers=me_headers,
        )
    assert history.json() == {"settlements": [], "total": 0}
    _clear_overrides()


async def test_duplicate_confirmation_fails_safely(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")
    me_headers = await _auth_headers(db, me)
    aman_headers = await _auth_headers(db, aman)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=me_headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "500.00",
            },
        )
        sid = created.json()["id"]
        first = await client.post(
            f"/api/settlements/{sid}/confirm", headers=aman_headers
        )
        second = await client.post(
            f"/api/settlements/{sid}/confirm", headers=aman_headers
        )
        # Confirmed rows are immutable: no reject/cancel either.
        reject = await client.post(
            f"/api/settlements/{sid}/reject", headers=aman_headers,
            json={},
        )
        cancel = await client.post(
            f"/api/settlements/{sid}/cancel", headers=me_headers
        )
    assert first.status_code == 200
    assert second.status_code == 409
    assert reject.status_code == 409
    assert cancel.status_code == 409
    assert (
        await SettlementService.outstanding(db, group.id, me.id, aman.id)
        == Decimal("0.00")
    )
    _clear_overrides()


async def test_payer_can_cancel_pending(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")
    me_headers = await _auth_headers(db, me)
    aman_headers = await _auth_headers(db, aman)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=me_headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "500.00",
            },
        )
        # Receiver cannot cancel; payer can.
        denied = await client.post(
            f"/api/settlements/{created.json()['id']}/cancel",
            headers=aman_headers,
        )
        cancelled = await client.post(
            f"/api/settlements/{created.json()['id']}/cancel",
            headers=me_headers,
        )
    assert denied.status_code == 403
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert (
        await SettlementService.outstanding(db, group.id, me.id, aman.id)
        == Decimal("500.00")
    )
    _clear_overrides()


async def test_history_preserves_confirmed(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")
    me_headers = await _auth_headers(db, me)
    aman_headers = await _auth_headers(db, aman)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=me_headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "500.00",
                "note": "UPI done",
            },
        )
        await client.post(
            f"/api/settlements/{created.json()['id']}/confirm",
            headers=aman_headers,
        )
        group_history = await client.get(
            f"/api/settlements/groups/{group.id}/history",
            headers=me_headers,
        )
        person_history = await client.get(
            f"/api/settlements/people/{aman.id}/history",
            headers=me_headers,
        )
    assert group_history.json()["total"] == 1
    entry = group_history.json()["settlements"][0]
    assert entry["amount"] == "500.00"
    assert entry["note"] == "UPI done"
    assert entry["status"] == "paid"
    assert entry["confirmed_at"] is not None
    assert person_history.json()["total"] == 1
    _clear_overrides()


async def test_history_pagination(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")
    me_headers = await _auth_headers(db, me)
    aman_headers = await _auth_headers(db, aman)
    async with _asgi_client(db) as client:
        for part in ("200.00", "200.00", "100.00"):
            created = await client.post(
                "/api/settlements",
                headers=me_headers,
                json={
                    "group_id": str(group.id),
                    "receiver_user_id": str(aman.id),
                    "amount": part,
                },
            )
            assert created.status_code == 200
            await client.post(
                f"/api/settlements/{created.json()['id']}/confirm",
                headers=aman_headers,
            )
        page1 = await client.get(
            f"/api/settlements/groups/{group.id}/history?limit=2&offset=0",
            headers=me_headers,
        )
        page2 = await client.get(
            f"/api/settlements/groups/{group.id}/history?limit=2&offset=2",
            headers=me_headers,
        )
    assert page1.json()["total"] == 3
    assert len(page1.json()["settlements"]) == 2
    assert len(page2.json()["settlements"]) == 1
    _clear_overrides()


async def test_pending_endpoint_only_receivers(db, members):
    users, group_ids = members
    me, aman, other = users
    group = await _group(
        db, me, [aman, other], group_ids=group_ids
    )
    await _expense(db, me, group, aman, "900.00")
    me_headers = await _auth_headers(db, me)
    aman_headers = await _auth_headers(db, aman)
    other_headers = await _auth_headers(db, other)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=me_headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "300.00",
            },
        )
        assert created.status_code == 200
        mine = await client.get(
            "/api/settlements/pending-confirmations", headers=aman_headers
        )
        not_mine_payer = await client.get(
            "/api/settlements/pending-confirmations", headers=me_headers
        )
        not_mine_other = await client.get(
            "/api/settlements/pending-confirmations", headers=other_headers
        )
    assert len(mine.json()["pending"]) == 1
    assert mine.json()["pending"][0]["payer_name"] == "Settle A"
    assert mine.json()["pending"][0]["group_name"] == "Trip"
    assert not_mine_payer.json()["pending"] == []
    assert not_mine_other.json()["pending"] == []
    _clear_overrides()


# ---------------------------------------------------------------------------
# Validation + authorization
# ---------------------------------------------------------------------------


async def test_amount_cannot_exceed_outstanding(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")  # owe 500
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/settlements",
            headers=headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "500.01",
            },
        )
    assert response.status_code == 422
    _clear_overrides()


async def test_cannot_initiate_without_debt(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, me, "1000.00")  # aman owes ME
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/settlements",
            headers=headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "100.00",
            },
        )
    assert response.status_code == 409
    _clear_overrides()


async def test_duplicate_pending_rejected(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")
    headers = await _auth_headers(db, me)
    payload = {
        "group_id": str(group.id),
        "receiver_user_id": str(aman.id),
        "amount": "100.00",
        "idempotency_key": "tap-1",
    }
    async with _asgi_client(db) as client:
        first = await client.post(
            "/api/settlements", headers=headers, json=payload
        )
        second = await client.post(
            "/api/settlements", headers=headers, json=payload
        )
    assert first.status_code == 200
    assert second.status_code == 409
    _clear_overrides()


async def test_cannot_access_other_group(db, members):
    users, group_ids = members
    me, aman, outsider = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    headers = await _auth_headers(db, outsider)
    async with _asgi_client(db) as client:
        detail = await client.get(
            f"/api/groups/{group.id}", headers=headers
        )
        history = await client.get(
            f"/api/settlements/groups/{group.id}/history",
            headers=headers,
        )
        settle = await client.post(
            "/api/settlements",
            headers=headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(me.id),
                "amount": "10.00",
            },
        )
        suggestions = await client.get(
            f"/api/groups/{group.id}/suggestions", headers=headers
        )
    assert detail.status_code == 404
    assert history.status_code == 404
    assert settle.status_code == 404
    assert suggestions.status_code == 404
    _clear_overrides()


async def test_cannot_confirm_other_group_payment(db, members):
    users, group_ids = members
    me, aman, outsider = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")
    me_headers = await _auth_headers(db, me)
    outsider_headers = await _auth_headers(db, outsider)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/settlements",
            headers=me_headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(aman.id),
                "amount": "500.00",
            },
        )
        confirm = await client.post(
            f"/api/settlements/{created.json()['id']}/confirm",
            headers=outsider_headers,
        )
        read = await client.get(
            f"/api/settlements/{created.json()['id']}",
            headers=outsider_headers,
        )
    assert confirm.status_code == 404
    assert read.status_code == 404
    _clear_overrides()


async def test_receiver_must_be_member(db, members):
    users, group_ids = members
    me, aman, outsider = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    await _expense(db, me, group, aman, "1000.00")
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/settlements",
            headers=headers,
            json={
                "group_id": str(group.id),
                "receiver_user_id": str(outsider.id),
                "amount": "100.00",
            },
        )
    assert response.status_code == 422
    _clear_overrides()


async def test_currency_matches_group(db, members):
    users, group_ids = members
    me, aman, _ = users
    group = await _group(db, me, [aman], group_ids=group_ids)
    assert group.currency == "INR"
    await _expense(db, me, group, aman, "1000.00")
    row = await SettlementService.initiate(
        db,
        payer_id=me.id,
        group_id=group.id,
        receiver_id=aman.id,
        amount="500.00",
    )
    assert row.currency == "INR"
    stored = await db.scalar(
        select(Expense).where(Expense.group_id == group.id)
    )
    assert stored is not None and stored.currency == "INR"
    await db.execute(delete(Settlement).where(Settlement.id == row.id))
    await db.commit()


async def test_groups_crud_and_join(db, members):
    users, group_ids = members
    me, other, _ = users
    me_headers = await _auth_headers(db, me)
    other_headers = await _auth_headers(db, other)
    async with _asgi_client(db) as client:
        created = await client.post(
            "/api/groups",
            headers=me_headers,
            json={"name": "Hostel Food", "group_type": "hostel"},
        )
        assert created.status_code == 200
        group_id = created.json()["id"]
        group_ids.append(group_id)
        invite_code = created.json()["invite_code"]
        assert invite_code

        listed = await client.get("/api/groups", headers=me_headers)
        assert [g["name"] for g in listed.json()["groups"]] == [
            "Hostel Food"
        ]

        joined = await client.post(
            "/api/groups/join",
            headers=other_headers,
            json={"invite_code": invite_code},
        )
        assert joined.status_code == 200
        detail = await client.get(
            f"/api/groups/{group_id}", headers=other_headers
        )
        assert detail.json()["member_count"] == 2

        # Non-admin cannot archive.
        denied = await client.post(
            f"/api/groups/{group_id}/archive", headers=other_headers
        )
        assert denied.status_code == 403
        archived = await client.post(
            f"/api/groups/{group_id}/archive", headers=me_headers
        )
        assert archived.json()["lifecycle"] == "archived"
    _clear_overrides()


async def test_expense_equal_and_custom_splits(db, members):
    users, group_ids = members
    me, b, c = users
    group = await _group(db, me, [b, c], group_ids=group_ids)
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        # 100 split equally among 3 -> penny distribution sums exactly.
        equal = await client.post(
            "/api/expenses",
            headers=headers,
            json={
                "group_id": str(group.id),
                "title": "Chai",
                "amount": "100.00",
            },
        )
        assert equal.status_code == 200
        shares = sorted(
            Decimal(s["share_amount"])
            for s in equal.json()["splits"]
        )
        assert shares == [Decimal("33.33"), Decimal("33.33"), Decimal("33.34")]
        assert sum(shares) == Decimal("100.00")

        bad = await client.post(
            "/api/expenses",
            headers=headers,
            json={
                "group_id": str(group.id),
                "title": "Bad",
                "amount": "100.00",
                "split_type": "custom",
                "splits": [
                    {"user_id": str(b.id), "share_amount": "60.00"},
                    {"user_id": str(c.id), "share_amount": "30.00"},
                ],
            },
        )
        assert bad.status_code == 422

        listed = await client.get(
            f"/api/expenses?group_id={group.id}&limit=1&offset=0",
            headers=headers,
        )
        assert listed.json()["total"] == 1
        assert len(listed.json()["expenses"]) == 1
    _clear_overrides()


async def test_invite_accept_adds_membership(db, members):
    from backend.services.group_invitation_service import (
        GroupInvitationService,
    )

    users, group_ids = members
    me, other, _ = users
    group = await _group(db, me, [], name="Flat", group_ids=group_ids)
    invite = GroupInvitation(
        user_id=other.id,
        group_name=group.name,
        invite_code=group.invite_code,
        invited_by="Settle A",
        status="pending",
    )
    db.add(invite)
    await db.flush()
    row = await GroupInvitationService.accept(db, other.id, invite.id)
    assert row.status == "accepted"
    membership = await db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group.id,
            GroupMember.user_id == other.id,
        )
    )
    assert membership is not None
    await db.execute(
        delete(GroupInvitation).where(GroupInvitation.id == invite.id)
    )
    await db.commit()


async def test_leave_group_member_and_admin_promotion(db, members):
    users, group_ids = members
    me, other, third = users
    group = await _group(
        db, me, [other, third], name="Flat", group_ids=group_ids
    )
    other_headers = await _auth_headers(db, other)
    me_headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        left = await client.delete(
            f"/api/groups/{group.id}/members/me", headers=other_headers
        )
        assert left.status_code == 200
        assert left.json()["status"] == "left"
        # Member who left can no longer read the group.
        gone = await client.get(
            f"/api/groups/{group.id}", headers=other_headers
        )
        assert gone.status_code == 404
        # Admin leaves: another member is promoted, group survives.
        admin_left = await client.delete(
            f"/api/groups/{group.id}/members/me", headers=me_headers
        )
        assert admin_left.json()["status"] == "left"
    admins = (
        (
            await db.execute(
                select(GroupMember).where(
                    GroupMember.group_id == group.id,
                    GroupMember.role == "admin",
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(admins) == 1
    assert admins[0].user_id == third.id
    _clear_overrides()


async def test_leave_group_last_member_deletes(db, members):
    users, group_ids = members
    me, _, _ = users
    group = await _group(db, me, [], name="Solo", group_ids=group_ids)
    headers = await _auth_headers(db, me)
    async with _asgi_client(db) as client:
        response = await client.delete(
            f"/api/groups/{group.id}/members/me", headers=headers
        )
    assert response.status_code == 200
    assert response.json()["status"] == "deleted"
    assert await db.get(Group, group.id) is None
    group_ids.clear()
    _clear_overrides()


async def test_archive_and_rotate_and_lookup(db, members):
    users, group_ids = members
    me, other, _ = users
    group = await _group(db, me, [other], group_ids=group_ids)
    old_code = group.invite_code
    me_headers = await _auth_headers(db, me)
    other_headers = await _auth_headers(db, other)
    async with _asgi_client(db) as client:
        rotated = await client.post(
            f"/api/groups/{group.id}/invite-code/rotate",
            headers=me_headers,
        )
        assert rotated.status_code == 200
        new_code = rotated.json()["invite_code"]
        assert new_code and new_code != old_code
        # Non-admin cannot rotate.
        denied = await client.post(
            f"/api/groups/{group.id}/invite-code/rotate",
            headers=other_headers,
        )
        assert denied.status_code == 403
        # Lookup by code previews without leaking the code itself.
        preview = await client.get(
            "/api/groups/search/by-code",
            params={"code": new_code},
            headers=other_headers,
        )
        assert preview.status_code == 200
        assert preview.json()["name"] == "Trip"
        assert preview.json()["invite_code"] is None
        unknown = await client.get(
            "/api/groups/search/by-code",
            params={"code": "NOPE1234"},
            headers=other_headers,
        )
        assert unknown.status_code == 404
    _clear_overrides()


async def test_settlement_endpoints_require_auth(db, members):
    users, group_ids = members
    me, other, _ = users
    group = await _group(db, me, [other], group_ids=group_ids)
    async with _asgi_client(db) as client:
        assert (await client.get("/api/groups")).status_code == 401
        assert (
            await client.get(f"/api/groups/{group.id}")
        ).status_code == 401
        assert (await client.post("/api/settlements", json={})).status_code in (
            401,
            422,
        )
        assert (
            await client.get("/api/settlements/pending-confirmations")
        ).status_code == 401
        assert (
            await client.get(f"/api/expenses?group_id={group.id}")
        ).status_code == 401
    _clear_overrides()
