"""
Tests for Page 04/05: static preferences + notification counts.

Conventions follow the existing suite: the shared `db` fixture provides
a clean async session (conftest truncates user_preferences too);
endpoint tests drive the ASGI app with httpx and override `get_db` so
auth + handlers share the test session.
"""

from __future__ import annotations

import httpx
import pytest_asyncio
from sqlalchemy import delete, func, select

from backend.database import AsyncSessionLocal, get_db
from backend.main import app
from backend.models.activity import Activity, ActivityType
from backend.models.user import AccountStatus, User
from backend.models.user_preference import UserPreference
from backend.schemas.activity import ActivityCreate
from backend.services.activity_service import ActivityService
from backend.services.preferences_service import PreferencesService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def prefs_user(db):
    user = User(
        name="Prefs User",
        email="prefs-user@example.com",
        phone=None,
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    yield user
    await db.execute(delete(Activity).where(Activity.user_id == user.id))
    await db.execute(
        delete(UserPreference).where(UserPreference.user_id == user.id)
    )
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()


@pytest_asyncio.fixture
async def prefs_other(db):
    user = User(
        name="Prefs Other",
        email="prefs-other@example.com",
        phone=None,
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    yield user
    await db.execute(delete(Activity).where(Activity.user_id == user.id))
    await db.execute(
        delete(UserPreference).where(UserPreference.user_id == user.id)
    )
    await db.execute(delete(User).where(User.id == user.id))
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
# Retrieval: defaults + auth
# ---------------------------------------------------------------------------

async def test_preferences_require_auth(db, prefs_user):
    async with _asgi_client(db) as client:
        response = await client.get("/api/users/me/preferences")
        counts = await client.get("/api/users/me/notifications/counts")
    assert response.status_code == 401
    assert counts.status_code == 401
    app.dependency_overrides.pop(get_db, None)


async def test_preferences_return_defaults_for_new_user(db, prefs_user):
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        response = await client.get(
            "/api/users/me/preferences", headers=headers
        )
    assert response.status_code == 200
    assert response.json() == {
        "currency": "INR",
        "date_format": "DD/MM/YYYY",
        "start_of_week": "monday",
        "app_language": "en",
        "display_name": "account_name",
    }
    app.dependency_overrides.pop(get_db, None)


async def test_lazy_created_preferences_row_is_persisted(db, prefs_user):
    """The lazy INSERT must actually COMMIT, not be silently rolled back.

    Regression test for the transaction-ordering bug: get_or_create ran
    its SELECT first, which autobegan a transaction, so the following
    transaction() refused to own it and the INSERT was rolled back. The
    endpoint still returned correct-looking defaults, which is why only a
    fresh, independent session can detect the difference.
    """
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        first = await client.get(
            "/api/users/me/preferences", headers=headers
        )
    assert first.status_code == 200

    # A separate session sees only what was really committed.
    async with AsyncSessionLocal() as verify:
        rows = (
            await verify.execute(
                select(UserPreference).where(
                    UserPreference.user_id == prefs_user.id
                )
            )
        ).scalars().all()
    assert len(rows) == 1
    assert rows[0].currency == "INR"
    assert rows[0].display_name == "account_name"

    app.dependency_overrides.pop(get_db, None)


async def test_second_read_does_not_insert_a_duplicate(db, prefs_user):
    """A repeat read must reuse the stored row, not insert again."""
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        await client.get("/api/users/me/preferences", headers=headers)
        second = await client.get(
            "/api/users/me/preferences", headers=headers
        )
    assert second.status_code == 200

    async with AsyncSessionLocal() as verify:
        count = await verify.scalar(
            select(func.count())
            .select_from(UserPreference)
            .where(UserPreference.user_id == prefs_user.id)
        )
    assert int(count) == 1

    app.dependency_overrides.pop(get_db, None)


async def test_lazy_created_preferences_are_isolated_per_user(
    db, prefs_user, prefs_other
):
    """Each user gets their own persisted row with safe defaults."""
    headers_a = await _auth_headers(db, prefs_user)
    headers_b = await _auth_headers(db, prefs_other)
    async with _asgi_client(db) as client:
        await client.get("/api/users/me/preferences", headers=headers_a)
        await client.get("/api/users/me/preferences", headers=headers_b)

    async with AsyncSessionLocal() as verify:
        rows = (
            await verify.execute(select(UserPreference))
        ).scalars().all()
    assert {row.user_id for row in rows} == {prefs_user.id, prefs_other.id}
    assert all(row.currency == "INR" for row in rows)

    app.dependency_overrides.pop(get_db, None)

async def test_patch_currency_persists(db, prefs_user):
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"currency": "INR"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["currency"] == "INR"
    assert body["date_format"] == "DD/MM/YYYY"
    prefs = await PreferencesService.get_or_create(db, prefs_user.id)
    assert prefs.currency == "INR"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_is_partial(db, prefs_user):
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        first = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"date_format": "YYYY-MM-DD", "start_of_week": "sunday"},
        )
        assert first.status_code == 200
        second = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"app_language": "en"},
        )
    assert second.status_code == 200
    body = second.json()
    # Earlier fields untouched by the second patch.
    assert body["date_format"] == "YYYY-MM-DD"
    assert body["start_of_week"] == "sunday"
    assert body["currency"] == "INR"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_rejects_invalid_values(db, prefs_user):
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        bad_currency = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"currency": "USD"},
        )
        bad_format = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"date_format": "yesterday"},
        )
        bad_week = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"start_of_week": "friday"},
        )
        bad_lang = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"app_language": "hi"},
        )
    for response in (bad_currency, bad_format, bad_week, bad_lang):
        assert response.status_code in (400, 422)
    # Stored row untouched.
    prefs = await PreferencesService.get_or_create(db, prefs_user.id)
    assert prefs.currency == "INR"
    assert prefs.date_format == "DD/MM/YYYY"
    app.dependency_overrides.pop(get_db, None)


async def test_service_rejects_disallowed_values(db, prefs_user):
    import pytest

    with pytest.raises(ValueError):
        await PreferencesService.update_preferences(
            db, prefs_user.id, currency="USD"
        )
    with pytest.raises(ValueError):
        await PreferencesService.update_preferences(
            db, prefs_user.id, app_language="hi"
        )


# ---------------------------------------------------------------------------
# Isolation: user A cannot touch user B
# ---------------------------------------------------------------------------

async def test_preferences_are_user_scoped(db, prefs_user, prefs_other):
    other_headers = await _auth_headers(db, prefs_other)
    async with _asgi_client(db) as client:
        await client.patch(
            "/api/users/me/preferences",
            headers=other_headers,
            json={"date_format": "MM/DD/YYYY"},
        )
        mine = await client.get(
            "/api/users/me/preferences",
            headers=await _auth_headers(db, prefs_user),
        )
    assert mine.json()["date_format"] == "DD/MM/YYYY"
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Notification counts: real activity data, always numbers
# ---------------------------------------------------------------------------

async def test_counts_start_at_zero(db, prefs_user):
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        response = await client.get(
            "/api/users/me/notifications/counts", headers=headers
        )
    assert response.status_code == 200
    assert response.json() == {
        "expense_updates": 0,
        "settlement_reminders": 0,
        "group_invitations": 0,
    }
    app.dependency_overrides.pop(get_db, None)


async def test_patch_display_name_persists(db, prefs_user):
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        set_it = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"display_name": "username"},
        )
        assert set_it.status_code == 200
        assert set_it.json()["display_name"] == "username"
        # Other fields untouched by the partial patch.
        assert set_it.json()["currency"] == "INR"
        rejected = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"display_name": "nickname"},
        )
    assert rejected.status_code in (400, 422)
    prefs = await PreferencesService.get_or_create(db, prefs_user.id)
    assert prefs.display_name == "username"
    app.dependency_overrides.pop(get_db, None)


async def test_counts_reflect_user_activity(db, prefs_user, prefs_other):
    for _ in range(3):
        await ActivityService.create_activity(
            db,
            prefs_user.id,
            ActivityCreate(type=ActivityType.EXPENSE, title="E"),
        )
    await ActivityService.create_activity(
        db,
        prefs_user.id,
        ActivityCreate(type=ActivityType.SETTLEMENT, title="S"),
    )
    # Other user's rows must not leak in.
    await ActivityService.create_activity(
        db,
        prefs_other.id,
        ActivityCreate(type=ActivityType.EXPENSE, title="Theirs"),
    )
    counts = await PreferencesService.get_notification_counts(
        db, prefs_user.id
    )
    assert counts == {
        "expense_updates": 3,
        "settlement_reminders": 1,
        "group_invitations": 0,
    }


# ---------------------------------------------------------------------------
# Date-format regression: every supported option persists and reads back.
#
# Same commit-visibility discipline as the profile tests: each PATCH is
# verified through a SEPARATE connection (what app reload / refetch
# observes), not just the request's own session.
# ---------------------------------------------------------------------------

SUPPORTED_DATE_FORMATS = ("DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD")


async def _fresh_date_format(user_id) -> str | None:
    """Committed-state read through a separate connection."""
    async with AsyncSessionLocal() as fresh:
        return await fresh.scalar(
            select(UserPreference.date_format).where(
                UserPreference.user_id == user_id
            )
        )


async def test_patch_each_date_format_persists_and_reads_back(
    db, prefs_user
):
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        for fmt in SUPPORTED_DATE_FORMATS:
            response = await client.patch(
                "/api/users/me/preferences",
                headers=headers,
                json={"date_format": fmt},
            )
            assert response.status_code == 200, fmt
            assert response.json()["date_format"] == fmt, fmt
            # Committed (separate connection), not just request-local.
            assert await _fresh_date_format(prefs_user.id) == fmt, fmt
            # Subsequent GET agrees (what reopening Preferences shows).
            reread = await client.get(
                "/api/users/me/preferences", headers=headers
            )
            assert reread.json()["date_format"] == fmt, fmt
    app.dependency_overrides.pop(get_db, None)


async def test_rejected_date_format_preserves_stored_value(db, prefs_user):
    headers = await _auth_headers(db, prefs_user)
    async with _asgi_client(db) as client:
        anchored = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"date_format": "YYYY-MM-DD"},
        )
        assert anchored.status_code == 200
        rejected = await client.patch(
            "/api/users/me/preferences",
            headers=headers,
            json={"date_format": "DD-MM-YYYY"},
        )
    assert rejected.status_code in (400, 422)
    # Stored value untouched by the failed update.
    assert await _fresh_date_format(prefs_user.id) == "YYYY-MM-DD"
    app.dependency_overrides.pop(get_db, None)
