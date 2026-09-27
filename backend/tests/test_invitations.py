"""
Tests for group invitations: pending list, accept/decline, isolation.

Conventions follow the existing suite: the shared `db` fixture provides
a clean async session; endpoint tests drive the ASGI app with httpx and
override `get_db` so auth + handlers share the test session.
"""

from __future__ import annotations

from uuid import uuid4

import httpx
import pytest_asyncio
from sqlalchemy import delete

from backend.database import get_db
from backend.main import app
from backend.models.group_invitation import GroupInvitation
from backend.models.user import AccountStatus, User
from backend.services.group_invitation_service import GroupInvitationService


@pytest_asyncio.fixture
async def invite_user(db):
    user = User(
        name="Invite User",
        email="invite-user@example.com",
        phone=None,
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    yield user
    await db.execute(
        delete(GroupInvitation).where(GroupInvitation.user_id == user.id)
    )
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()


@pytest_asyncio.fixture
async def invite_other(db):
    user = User(
        name="Invite Other",
        email="invite-other@example.com",
        phone=None,
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    yield user
    await db.execute(
        delete(GroupInvitation).where(GroupInvitation.user_id == user.id)
    )
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()


async def _invite(db, user, **overrides):
    row = GroupInvitation(
        user_id=user.id,
        group_name=overrides.get("group_name", "Weekend Trip"),
        invite_code=overrides.get("invite_code", "ABC123"),
        invited_by=overrides.get("invited_by", "Rohit"),
        status=overrides.get("status", "pending"),
    )
    db.add(row)
    await db.flush()
    return row


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


async def test_pending_lists_only_mine(db, invite_user, invite_other):
    await _invite(db, invite_user, group_name="Weekend Trip")
    await _invite(db, invite_user, group_name="Old Trip", status="accepted")
    await _invite(db, invite_other, group_name="Their Trip")
    headers = await _auth_headers(db, invite_user)
    async with _asgi_client(db) as client:
        response = await client.get("/api/invitations/mine", headers=headers)
    assert response.status_code == 200
    invitations = response.json()["invitations"]
    assert [i["group_name"] for i in invitations] == ["Weekend Trip"]
    assert invitations[0]["invited_by"] == "Rohit"
    assert invitations[0]["status"] == "pending"
    app.dependency_overrides.pop(get_db, None)


async def test_accept_removes_from_pending(db, invite_user):
    row = await _invite(db, invite_user)
    headers = await _auth_headers(db, invite_user)
    async with _asgi_client(db) as client:
        accepted = await client.post(
            f"/api/invitations/{row.id}/accept", headers=headers
        )
        assert accepted.status_code == 200
        assert accepted.json()["status"] == "accepted"
        pending = await client.get("/api/invitations/mine", headers=headers)
    assert pending.json()["invitations"] == []
    # Re-accept is not pending anymore.
    async with _asgi_client(db) as client:
        again = await client.post(
            f"/api/invitations/{row.id}/accept", headers=headers
        )
    assert again.status_code == 404
    app.dependency_overrides.pop(get_db, None)


async def test_decline_removes_from_pending(db, invite_user):
    row = await _invite(db, invite_user)
    headers = await _auth_headers(db, invite_user)
    async with _asgi_client(db) as client:
        declined = await client.post(
            f"/api/invitations/{row.id}/decline", headers=headers
        )
        assert declined.status_code == 200
        assert declined.json()["status"] == "declined"
        pending = await client.get("/api/invitations/mine", headers=headers)
    assert pending.json()["invitations"] == []
    app.dependency_overrides.pop(get_db, None)


async def test_cannot_resolve_other_users_invitation(
    db, invite_user, invite_other
):
    row = await _invite(db, invite_other)
    headers = await _auth_headers(db, invite_user)
    async with _asgi_client(db) as client:
        accept = await client.post(
            f"/api/invitations/{row.id}/accept", headers=headers
        )
        decline = await client.post(
            f"/api/invitations/{row.id}/decline", headers=headers
        )
    assert accept.status_code == 404
    assert decline.status_code == 404
    pending = await GroupInvitationService.list_pending(db, invite_other.id)
    assert len(pending) == 1
    app.dependency_overrides.pop(get_db, None)


async def test_unknown_invitation_is_404(db, invite_user):
    headers = await _auth_headers(db, invite_user)
    async with _asgi_client(db) as client:
        response = await client.post(
            f"/api/invitations/{uuid4()}/accept", headers=headers
        )
    assert response.status_code == 404
    app.dependency_overrides.pop(get_db, None)


async def test_invitations_require_auth(db, invite_user):
    async with _asgi_client(db) as client:
        response = await client.get("/api/invitations/mine")
    assert response.status_code == 401
    app.dependency_overrides.pop(get_db, None)
