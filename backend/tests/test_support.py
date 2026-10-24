"""
Tests for Pages 10-11: FAQs (read-only) + support requests.

Conventions follow the existing suite: the shared `db` fixture provides
a clean async session (conftest truncates faqs/support_requests too);
endpoint tests drive the ASGI app with httpx and override `get_db` so
auth + handlers share the test session.
"""

from __future__ import annotations

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import delete

from backend.database import get_db
from backend.main import app
from backend.models.faq import Faq
from backend.models.support_request import SupportRequest
from backend.models.user import AccountStatus, User
from backend.services.faq_service import FaqService
from backend.services.support_service import SupportService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def support_user(db):
    user = User(
        name="Support User",
        email="support-user@example.com",
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
        delete(SupportRequest).where(SupportRequest.user_id == user.id)
    )
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()


@pytest_asyncio.fixture
async def support_other(db):
    user = User(
        name="Support Other",
        email="support-other@example.com",
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
        delete(SupportRequest).where(SupportRequest.user_id == user.id)
    )
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()


@pytest_asyncio.fixture
async def seed_faqs(db):
    rows = [
        Faq(
            question="How do I add an expense?",
            answer="Open a group and add it.",
            category="expenses",
            display_order=1,
            is_active=True,
        ),
        Faq(
            question="How do I join a group?",
            answer="Enter the invite code.",
            category="groups",
            display_order=0,
            is_active=True,
        ),
        Faq(
            question="Retired question?",
            answer="Hidden.",
            category="general",
            display_order=0,
            is_active=False,
        ),
    ]
    db.add_all(rows)
    await db.flush()
    yield rows
    await db.execute(
        delete(Faq).where(
            Faq.question.in_([r.question for r in rows])
        )
    )
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


# ---------------------------------------------------------------------------
# FAQ: auth + active-only + order + search + category
# ---------------------------------------------------------------------------

async def test_faqs_require_auth(db, support_user, seed_faqs):
    async with _asgi_client(db) as client:
        response = await client.get("/api/support/faqs")
    assert response.status_code == 401
    app.dependency_overrides.pop(get_db, None)


async def test_faqs_active_only_ordered(db, support_user, seed_faqs):
    headers = await _auth_headers(db, support_user)
    async with _asgi_client(db) as client:
        response = await client.get("/api/support/faqs", headers=headers)
    assert response.status_code == 200
    faqs = response.json()["faqs"]
    assert [f["question"] for f in faqs] == [
        "How do I join a group?",
        "How do I add an expense?",
    ]
    app.dependency_overrides.pop(get_db, None)


async def test_faqs_search_and_category(db, support_user, seed_faqs):
    headers = await _auth_headers(db, support_user)
    async with _asgi_client(db) as client:
        search = await client.get(
            "/api/support/faqs", headers=headers, params={"q": "EXPENSE"}
        )
        category = await client.get(
            "/api/support/faqs", headers=headers, params={"category": "groups"}
        )
        empty = await client.get(
            "/api/support/faqs", headers=headers, params={"q": "zzz-no-match"}
        )
    assert [f["question"] for f in search.json()["faqs"]] == [
        "How do I add an expense?"
    ]
    assert [f["question"] for f in category.json()["faqs"]] == [
        "How do I join a group?"
    ]
    assert empty.json()["faqs"] == []
    app.dependency_overrides.pop(get_db, None)


async def test_faq_service_empty_when_none(db, support_user):
    assert await FaqService.list_faqs(db) == []


# ---------------------------------------------------------------------------
# Support requests: create + validation + isolation + listing
# ---------------------------------------------------------------------------

async def test_create_bug_report(db, support_user):
    headers = await _auth_headers(db, support_user)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/support/requests",
            headers=headers,
            json={
                "type": "bug",
                "subject": "Crash on group open",
                "description": "The app closes when I open any group twice.",
                "app_version": "1.0.0",
                "screen": "groups",
            },
        )
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "bug"
    assert body["status"] == "open"
    assert body["subject"] == "Crash on group open"
    row = await SupportService.list_my_requests(db, support_user.id)
    assert len(row) == 1 and row[0].user_id == support_user.id
    app.dependency_overrides.pop(get_db, None)


async def test_create_rejects_invalid(db, support_user):
    headers = await _auth_headers(db, support_user)
    async with _asgi_client(db) as client:
        bad_type = await client.post(
            "/api/support/requests",
            headers=headers,
            json={"type": "complaint", "subject": "Valid subject here", "description": "A long enough description."},
        )
        short_subject = await client.post(
            "/api/support/requests",
            headers=headers,
            json={"type": "support", "subject": "ab", "description": "A long enough description."},
        )
        short_desc = await client.post(
            "/api/support/requests",
            headers=headers,
            json={"type": "feature_request", "subject": "Valid subject", "description": "short"},
        )
    assert bad_type.status_code == 422
    assert short_subject.status_code in (400, 422)
    assert short_desc.status_code in (400, 422)
    assert await SupportService.list_my_requests(db, support_user.id) == []
    app.dependency_overrides.pop(get_db, None)


async def test_requests_are_user_scoped(db, support_user, support_other):
    await SupportService.create_request(
        db,
        support_other.id,
        type="support",
        subject="Other subject",
        description="Other description long enough.",
    )
    mine = await SupportService.list_my_requests(db, support_user.id)
    assert mine == []
    headers = await _auth_headers(db, support_user)
    async with _asgi_client(db) as client:
        response = await client.get(
            "/api/support/requests", headers=headers
        )
    assert response.status_code == 200
    assert response.json()["requests"] == []
    app.dependency_overrides.pop(get_db, None)


async def test_service_validation(db, support_user):
    with pytest.raises(ValueError):
        await SupportService.create_request(
            db, support_user.id, type="nope",
            subject="Valid subject", description="Long enough description.",
        )
