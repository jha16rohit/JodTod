"""
Tests for Page 02: Personal Information + Edit Profile integration.

Covers the authenticated profile-update endpoint (Full Name, Username,
Phone Number; Email read-only), the server-calculated account-health
indicator (GREEN active / YELLOW dormant / RED high-spend with RED
precedence), cross-user isolation, and Page 01 photo compatibility.

Conventions follow the existing suite: the shared `db` fixture provides
a clean async session; endpoint tests drive the ASGI app with httpx and
override the `get_db` dependency so auth + handlers share the test
session. Activities are cleaned per fixture (conftest truncates only
the auth tables).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx
import pytest_asyncio
from sqlalchemy import delete

from backend.database import get_db
from backend.main import app
from backend.models.activity import Activity, ActivityType
from backend.models.user import AccountStatus, User
from backend.schemas.activity import ActivityCreate
from backend.services.activity_service import ActivityService
from backend.services.profile_service import (
    EXPENSE_THRESHOLD,
    INACTIVITY_THRESHOLD_DAYS,
    ProfileService,
    parse_expense_amount,
)
from backend.services.session_service import SessionService
from backend.services.user_service import (
    DuplicateProfileFieldError,
    UserService,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def info_user(db):
    user = User(
        name="Info User",
        username="infouser",
        email="info-user@example.com",
        phone="+91 90000 00001",
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    # Commit setup: endpoints commit/roll back their own transactions,
    # so fixtures must be durable before any endpoint call (a rollback
    # on an error path must never wipe setup rows or the auth session).
    await db.commit()
    # Capture the PK now: endpoint rollbacks expire ORM attributes, and
    # teardown must never trigger lazy loads.
    user_id = user.id
    yield user
    await db.execute(delete(Activity).where(Activity.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()


@pytest_asyncio.fixture
async def info_other(db):
    user = User(
        name="Other User",
        username="otheruser",
        email="info-other@example.com",
        phone="+91 90000 00002",
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    # Commit setup (see info_user): endpoint rollbacks must not wipe it.
    await db.commit()
    other_id = user.id
    yield user
    await db.execute(delete(Activity).where(Activity.user_id == other_id))
    await db.execute(delete(User).where(User.id == other_id))
    await db.commit()


async def _auth_headers(db, user) -> dict[str, str]:
    _, token_data = await SessionService.create_session(db, user)
    await db.flush()
    # Commit the auth session row too: an endpoint rollback on an error
    # path must not invalidate auth for later calls in the same test.
    await db.commit()
    return {"Authorization": f"Bearer {token_data['access_token']}"}


def _asgi_client(db):
    async def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    )


async def _backdate_user(db, user, days: int) -> None:
    """Move every qualifying activity signal `days` into the past."""
    old = datetime.now(timezone.utc) - timedelta(days=days)
    user.last_login_at = old
    user.updated_at = old
    await db.flush()


async def _add_expense(db, user, amount: str | None) -> None:
    await ActivityService.create_activity(
        db,
        user.id,
        ActivityCreate(type=ActivityType.EXPENSE, title="Expense", amount=amount),
    )


# ---------------------------------------------------------------------------
# Amount parser (pure unit tests, no DB assertions beyond import)
# ---------------------------------------------------------------------------

def test_parse_expense_amount_formatted_strings():
    assert parse_expense_amount("2,850") == 2850.0
    assert parse_expense_amount("10,000.50") == 10000.50
    assert parse_expense_amount(None) == 0.0
    assert parse_expense_amount("n/a") == 0.0
    assert parse_expense_amount("") == 0.0
    assert parse_expense_amount(42) == 42.0


# ---------------------------------------------------------------------------
# Retrieval: auth + contract
# ---------------------------------------------------------------------------

async def test_dashboard_requires_auth(db, info_user):
    async with _asgi_client(db) as client:
        response = await client.get("/api/users/me/profile")
    assert response.status_code == 401
    app.dependency_overrides.pop(get_db, None)


async def test_dashboard_returns_profile_and_health(db, info_user):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.get("/api/users/me/profile", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["profile"]["id"] == str(info_user.id)
    assert body["profile"]["username"] == "infouser"
    assert body["profile"]["email"] == "info-user@example.com"
    health = body["account_health"]
    assert health["status"] == "active"
    assert health["status_color"] == "green"
    assert health["status_label"] == "Active"
    assert health["expense_total"] == 0.0
    assert health["expense_threshold"] == EXPENSE_THRESHOLD
    assert health["inactivity_threshold_days"] == INACTIVITY_THRESHOLD_DAYS
    assert health["last_activity_at"] is not None
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Update: happy paths + persistence
# ---------------------------------------------------------------------------

async def test_patch_updates_name_username_phone(db, info_user):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={
                "name": "New Name",
                "username": "newhandle",
                "phone": "+1 415 555 0100",
            },
        )
    assert response.status_code == 200
    returned = response.json()["user"]
    assert returned["name"] == "New Name"
    assert returned["username"] == "newhandle"
    assert returned["phone"] == "+1 415 555 0100"
    # Persisted server-side.
    await db.refresh(info_user)
    assert info_user.name == "New Name"
    assert info_user.username == "newhandle"
    assert info_user.phone == "+1 415 555 0100"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_requires_auth(db, info_user):
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me", json={"name": "Nope"}
        )
    assert response.status_code == 401
    app.dependency_overrides.pop(get_db, None)


async def test_patch_rejects_empty_name(db, info_user):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me", headers=headers, json={"name": "   "}
        )
    assert response.status_code == 400
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Email is read-only
# ---------------------------------------------------------------------------

async def test_patch_ignores_email_change(db, info_user):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={"name": "Still Me", "email": "attacker@example.com"},
        )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "info-user@example.com"
    await db.refresh(info_user)
    assert info_user.email == "info-user@example.com"
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Username validation + uniqueness
# ---------------------------------------------------------------------------

async def test_patch_rejects_invalid_username(db, info_user):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        bad_chars = await client.patch(
            "/api/users/me", headers=headers, json={"username": "not ok!!"}
        )
        too_short = await client.patch(
            "/api/users/me", headers=headers, json={"username": "ab"}
        )
    assert bad_chars.status_code == 400
    assert too_short.status_code == 400
    await db.refresh(info_user)
    assert info_user.username == "infouser"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_rejects_duplicate_username(db, info_user, info_other):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        # Case-insensitive collision with the other user.
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={"username": "OtherUser"},
        )
    assert response.status_code == 409
    await db.refresh(info_user)
    assert info_user.username == "infouser"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_keeping_own_username_is_not_a_collision(db, info_user):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={"username": "infouser", "name": "Same Handle"},
        )
    assert response.status_code == 200
    assert response.json()["user"]["username"] == "infouser"
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Commit regression: PATCH must persist beyond the request session.
#
# A prior defect returned HTTP 200 with the new username while silently
# rolling the update back (read-before-write on a fresh session left
# transaction() unowned and get_db never commits). Same-session reads
# cannot catch that class: every assertion below re-reads through a
# SEPARATE connection, exactly what app reload / refetch observes.
# ---------------------------------------------------------------------------

async def _fresh_username(user_id) -> str | None:
    """Committed-state read through a separate connection."""
    from backend.database import AsyncSessionLocal
    from sqlalchemy import select as sa_select

    async with AsyncSessionLocal() as fresh:
        return await fresh.scalar(
            sa_select(User.username).where(User.id == user_id)
        )


async def test_patch_sets_username_from_null_and_commits(db, info_user):
    # CASE A: username currently NULL (the common real-world state).
    uid = info_user.id
    info_user.username = None
    await db.flush()
    await db.commit()
    assert await _fresh_username(uid) is None

    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        # Exact Edit Profile payload shape: all three fields, trimmed.
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={
                "name": "Info User",
                "username": "arkadeep",
                "phone": "+91 90000 00001",
            },
        )
        assert response.status_code == 200
        assert response.json()["user"]["username"] == "arkadeep"
        # CASE G/H: subsequent reads (new connections, like reloads and
        # focus refetches) agree with the response and the database.
        assert await _fresh_username(uid) == "arkadeep"
        me = await client.get("/api/users/me", headers=headers)
        assert me.json()["user"]["username"] == "arkadeep"
        profile = await client.get("/api/users/me/profile", headers=headers)
        assert profile.json()["profile"]["username"] == "arkadeep"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_username_only_partial_update_commits(db, info_user):
    # CASE B: only username supplied; name/phone stay untouched.
    uid = info_user.id
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={"username": "solochange"},
        )
    assert response.status_code == 200
    assert response.json()["user"]["username"] == "solochange"
    assert await _fresh_username(uid) == "solochange"
    await db.refresh(info_user)
    assert info_user.name == "Info User"
    assert info_user.phone == "+91 90000 00001"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_unchanged_username_stays_stable(db, info_user):
    # CASE C: re-saving the current username is a stable no-op.
    uid = info_user.id
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={"username": "infouser"},
        )
    assert response.status_code == 200
    assert await _fresh_username(uid) == "infouser"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_duplicate_username_preserves_stored_value(
    db, info_user, info_other
):
    # CASE D: collision rejects AND committed state is untouched.
    uid = info_user.id
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={"username": "otheruser"},
        )
    assert response.status_code == 409
    assert await _fresh_username(uid) == "infouser"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_invalid_username_preserves_stored_value(db, info_user):
    # CASE E: invalid value rejects AND committed state is untouched.
    uid = info_user.id
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={"username": "ab"},
        )
    assert response.status_code in (400, 422)
    assert await _fresh_username(uid) == "infouser"
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Phone validation + uniqueness
# ---------------------------------------------------------------------------

async def test_patch_rejects_invalid_phone(db, info_user):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        bad_chars = await client.patch(
            "/api/users/me", headers=headers, json={"phone": "123-abc-!!"}
        )
        too_few_digits = await client.patch(
            "/api/users/me", headers=headers, json={"phone": "+1 23"}
        )
    assert bad_chars.status_code == 400
    assert too_few_digits.status_code in (400, 422)
    await db.refresh(info_user)
    assert info_user.phone == "+91 90000 00001"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_rejects_duplicate_phone(db, info_user, info_other):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={"phone": "+91 90000 00002"},
        )
    assert response.status_code == 409
    await db.refresh(info_user)
    assert info_user.phone == "+91 90000 00001"
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Service-level: email never touched, duplicate error type
# ---------------------------------------------------------------------------

async def test_service_update_never_touches_email(db, info_user):
    import inspect

    # The update signature has no email/user_id parameter at all.
    params = inspect.signature(UserService.update_profile).parameters
    assert "email" not in params
    assert "user_id" not in params
    before = info_user.email
    await UserService.update_profile(db, info_user, name="Svc Name")
    assert info_user.email == before


async def test_service_duplicate_username_raises(db, info_user, info_other):
    try:
        await UserService.update_profile(db, info_user, username="otheruser")
    except DuplicateProfileFieldError:
        pass
    else:
        raise AssertionError("expected DuplicateProfileFieldError")


# ---------------------------------------------------------------------------
# Account-health status logic
# ---------------------------------------------------------------------------

async def test_health_green_for_fresh_user(db, info_user):
    health = await ProfileService.get_account_health(db, info_user)
    assert (health["status"], health["status_color"]) == ("active", "green")
    assert health["expense_total"] == 0.0


async def test_health_red_when_expenses_exceed_threshold(db, info_user):
    await _add_expense(db, info_user, "6,000")
    await _add_expense(db, info_user, "5,500.75")
    health = await ProfileService.get_account_health(db, info_user)
    assert abs(health["expense_total"] - 11500.75) < 1e-6
    assert (health["status"], health["status_color"]) == ("high_spend", "red")
    assert health["status_label"] == "High spend"


async def test_health_boundary_at_threshold_stays_green(db, info_user):
    await _add_expense(db, info_user, "10,000")
    health = await ProfileService.get_account_health(db, info_user)
    assert health["expense_total"] == 10000.0
    assert health["status"] == "active"


async def test_health_yellow_after_90_days_inactive(db, info_user):
    await _backdate_user(db, info_user, INACTIVITY_THRESHOLD_DAYS + 10)
    health = await ProfileService.get_account_health(db, info_user)
    assert (health["status"], health["status_color"]) == ("dormant", "yellow")
    assert health["status_label"] == "Dormant"


async def test_health_recent_login_is_green(db, info_user):
    await _backdate_user(db, info_user, INACTIVITY_THRESHOLD_DAYS + 10)
    info_user.last_login_at = datetime.now(timezone.utc)
    await db.flush()
    # Re-read inside an async context: attribute expiry after flush
    # cannot lazy-load outside one (MissingGreenlet otherwise).
    await db.refresh(info_user)
    health = await ProfileService.get_account_health(db, info_user)
    assert health["status"] == "active"


async def test_health_red_takes_precedence_over_dormant(db, info_user):
    await _backdate_user(db, info_user, INACTIVITY_THRESHOLD_DAYS + 10)
    await _add_expense(db, info_user, "50,000")
    health = await ProfileService.get_account_health(db, info_user)
    assert (health["status"], health["status_color"]) == ("high_spend", "red")


async def test_health_ignores_non_expense_amounts(db, info_user):
    await ActivityService.create_activity(
        db,
        info_user.id,
        ActivityCreate(
            type=ActivityType.MEMBER, title="Member", amount="50,000"
        ),
    )
    health = await ProfileService.get_account_health(db, info_user)
    assert health["expense_total"] == 0.0
    assert health["status"] == "active"


async def test_health_endpoint_reports_red(db, info_user):
    await _add_expense(db, info_user, "11,000")
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.get("/api/users/me/profile", headers=headers)
    assert response.status_code == 200
    health = response.json()["account_health"]
    assert health["status"] == "high_spend"
    assert health["status_color"] == "red"
    app.dependency_overrides.pop(get_db, None)


async def test_health_endpoint_reports_yellow(db, info_user):
    await _backdate_user(db, info_user, INACTIVITY_THRESHOLD_DAYS + 10)
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.get("/api/users/me/profile", headers=headers)
    assert response.status_code == 200
    health = response.json()["account_health"]
    assert health["status"] == "dormant"
    assert health["status_color"] == "yellow"
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Cross-user isolation
# ---------------------------------------------------------------------------

async def test_update_only_touches_own_record(db, info_user, info_other):
    headers = await _auth_headers(db, info_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me",
            headers=headers,
            json={"name": "A Changed", "username": "achanged", "phone": "+44 7700 900001"},
        )
    assert response.status_code == 200
    await db.refresh(info_other)
    assert info_other.name == "Other User"
    assert info_other.username == "otheruser"
    assert info_other.phone == "+91 90000 00002"
    app.dependency_overrides.pop(get_db, None)


async def test_health_is_user_scoped(db, info_user, info_other):
    await _add_expense(db, info_other, "99,000")
    health = await ProfileService.get_account_health(db, info_user)
    assert health["expense_total"] == 0.0
    assert health["status"] == "active"


# ---------------------------------------------------------------------------
# Page 01 photo compatibility: dashboard reflects upload/removal
# ---------------------------------------------------------------------------

async def test_dashboard_reflects_photo_changes(db, info_user):
    import io

    from fastapi import UploadFile

    from backend.services.profile_photo_service import ProfilePhotoService

    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64

    async def _dashboard_avatar():
        headers = await _auth_headers(db, info_user)
        async with _asgi_client(db) as client:
            response = await client.get(
                "/api/users/me/profile", headers=headers
            )
        assert response.status_code == 200
        app.dependency_overrides.pop(get_db, None)
        return response.json()["profile"]["avatar_url"]

    upload = UploadFile(
        file=io.BytesIO(png),
        filename="me.png",
        headers={"content-type": "image/png"},
    )
    stored = await ProfilePhotoService.set_profile_photo(
        db, info_user, upload
    )
    assert await _dashboard_avatar() == stored

    await ProfilePhotoService.clear_profile_photo(db, info_user)
    assert await _dashboard_avatar() is None
