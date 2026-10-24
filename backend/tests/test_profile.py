"""
Tests for the My Profile dashboard, profile update, and profile-photo
upload/removal (Page 01).

Conventions follow the existing suite: the shared `db` fixture provides
a clean async session; service tests call services directly; endpoint
tests drive the ASGI app with httpx and override the `get_db`
dependency so auth + handlers share the test session.
"""

from __future__ import annotations

import io
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio
from fastapi import UploadFile
from sqlalchemy import delete

from backend.database import get_db
from backend.main import app
from backend.models.activity import Activity, ActivityType
from backend.models.user import AccountStatus, User
from backend.schemas.activity import ActivityCreate
from backend.services.activity_service import ActivityService
from backend.services.profile_photo_service import (
    UPLOAD_ROOT,
    InvalidPhotoError,
    PhotoTooLargeError,
    ProfilePhotoService,
)
from backend.services.profile_service import ProfileService
from backend.services.session_service import SessionService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def profile_user(db):
    user = User(
        name="Profile User",
        email="profile-user@example.com",
        phone=None,
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    # Commit setup: PATCH /users/me commits/rolls back its own
    # transaction, so fixtures must be durable before endpoint calls.
    await db.commit()
    created_files: list[Path] = []
    yield user, created_files
    # Cleanup: activities, user row, and any photo files written.
    # Refresh first: endpoint rollbacks expire ORM attributes, and
    # teardown must never trigger lazy loads (MissingGreenlet).
    await db.refresh(user)
    user_id = user.id
    avatar_url = user.avatar_url
    await db.execute(delete(Activity).where(Activity.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
    if avatar_url:
        name = avatar_url.rsplit("/", 1)[-1]
        candidate = UPLOAD_ROOT / name
        try:
            candidate.unlink(missing_ok=True)
        except OSError:
            pass
    for path in created_files:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass


@pytest_asyncio.fixture
async def other_user(db):
    user = User(
        name="Other User",
        email="other-profile-user@example.com",
        phone=None,
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    # Commit setup (see profile_user): endpoint rollbacks must not wipe it.
    await db.commit()
    user_id = user.id
    yield user
    await db.execute(delete(Activity).where(Activity.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()


async def _auth_headers(db, user) -> dict[str, str]:
    _, token_data = await SessionService.create_session(db, user)
    await db.flush()
    # Commit the auth session row too: an endpoint rollback on an error
    # path must not invalidate auth for later calls in the same test.
    await db.commit()
    return {"Authorization": f"Bearer {token_data['access_token']}"}


def _upload(filename: str, content_type: str, payload: bytes) -> UploadFile:
    return UploadFile(
        file=io.BytesIO(payload),
        filename=filename,
        headers={"content-type": content_type},
    )


PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
)
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 64


def _asgi_client(db):
    async def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    )
    return client


# ---------------------------------------------------------------------------
# Dashboard service
# ---------------------------------------------------------------------------

async def test_dashboard_empty_state(db, profile_user):
    user, _ = profile_user
    data = await ProfileService.get_dashboard(db, user.id)
    assert data["profile"].id == user.id
    for section in ("groups", "expenses", "trips", "settlements"):
        assert data[section] == {"count": 0, "items": []}
    assert data["recent_activities"] == []


async def test_dashboard_recent_activities_user_scoped(
    db, profile_user, other_user
):
    user, _ = profile_user
    await ActivityService.create_activity(
        db,
        user.id,
        ActivityCreate(type=ActivityType.EXPENSE, title="Mine"),
    )
    await ActivityService.create_activity(
        db,
        other_user.id,
        ActivityCreate(type=ActivityType.EXPENSE, title="Theirs"),
    )
    data = await ProfileService.get_dashboard(db, user.id)
    titles = [a["title"] for a in data["recent_activities"]]
    assert titles == ["Mine"]


async def test_dashboard_missing_user_raises(db):
    with pytest.raises(LookupError):
        await ProfileService.get_dashboard(db, uuid4())


# ---------------------------------------------------------------------------
# Photo service: validation + persistence
# ---------------------------------------------------------------------------

async def test_photo_rejects_unsupported_type(db, profile_user):
    user, _ = profile_user
    with pytest.raises(InvalidPhotoError):
        await ProfilePhotoService.set_profile_photo(
            db, user, _upload("evil.txt", "text/plain", b"hello")
        )
    assert user.avatar_url is None


async def test_photo_rejects_oversized(db, profile_user):
    user, _ = profile_user
    big = b"\xff\xd8\xff\xe0" + b"\x00" * (6 * 1024 * 1024)
    with pytest.raises(PhotoTooLargeError):
        await ProfilePhotoService.set_profile_photo(
            db, user, _upload("big.jpg", "image/jpeg", big)
        )
    assert user.avatar_url is None


async def test_photo_upload_persists_and_file_exists(db, profile_user):
    user, files = profile_user
    url = await ProfilePhotoService.set_profile_photo(
        db, user, _upload("photo.png", "image/png", PNG_BYTES)
    )
    assert url.startswith("/uploads/profile_photos/")
    assert url.endswith(".png")
    assert user.avatar_url == url
    assert (UPLOAD_ROOT / url.rsplit("/", 1)[-1]).exists()


async def test_photo_replacement_cleans_old_file(db, profile_user):
    user, _ = profile_user
    first = await ProfilePhotoService.set_profile_photo(
        db, user, _upload("a.png", "image/png", PNG_BYTES)
    )
    first_path = UPLOAD_ROOT / first.rsplit("/", 1)[-1]
    second = await ProfilePhotoService.set_profile_photo(
        db, user, _upload("b.jpg", "image/jpeg", JPEG_BYTES)
    )
    assert second != first
    assert user.avatar_url == second
    assert not first_path.exists()
    assert (UPLOAD_ROOT / second.rsplit("/", 1)[-1]).exists()


async def test_failed_upload_preserves_existing_reference(db, profile_user):
    user, _ = profile_user
    good = await ProfilePhotoService.set_profile_photo(
        db, user, _upload("a.png", "image/png", PNG_BYTES)
    )
    with pytest.raises(InvalidPhotoError):
        await ProfilePhotoService.set_profile_photo(
            db, user, _upload("evil.txt", "text/plain", b"nope")
        )
    assert user.avatar_url == good
    assert (UPLOAD_ROOT / good.rsplit("/", 1)[-1]).exists()


async def test_photo_remove_safe_when_missing(db, profile_user):
    user, _ = profile_user
    await ProfilePhotoService.clear_profile_photo(db, user)
    assert user.avatar_url is None
    # Repeat removal stays safe.
    await ProfilePhotoService.clear_profile_photo(db, user)
    assert user.avatar_url is None


# ---------------------------------------------------------------------------
# Endpoints: auth + behavior
# ---------------------------------------------------------------------------

async def test_profile_endpoint_requires_auth(db, profile_user):
    async with _asgi_client(db) as client:
        response = await client.get("/api/users/me/profile")
    assert response.status_code == 401
    app.dependency_overrides.pop(get_db, None)


async def test_profile_endpoint_returns_own_data(db, profile_user):
    user, _ = profile_user
    headers = await _auth_headers(db, user)
    async with _asgi_client(db) as client:
        response = await client.get("/api/users/me/profile", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["profile"]["id"] == str(user.id)
    assert body["profile"]["email"] == "profile-user@example.com"
    for section in ("groups", "expenses", "trips", "settlements"):
        assert body[section] == {"count": 0, "items": []}
    assert body["recent_activities"] == []
    app.dependency_overrides.pop(get_db, None)


async def test_photo_upload_endpoint_valid_and_isolated(
    db, profile_user, other_user
):
    user, _ = profile_user
    headers = await _auth_headers(db, user)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/users/me/photo",
            headers=headers,
            files={"photo": ("me.png", PNG_BYTES, "image/png")},
        )
    assert response.status_code == 200
    assert response.json()["avatar_url"].startswith("/uploads/profile_photos/")
    # Other user's record untouched.
    await db.refresh(other_user)
    assert other_user.avatar_url is None
    app.dependency_overrides.pop(get_db, None)


async def test_photo_upload_endpoint_rejects_bad_type(db, profile_user):
    user, _ = profile_user
    headers = await _auth_headers(db, user)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/users/me/photo",
            headers=headers,
            files={"photo": ("evil.txt", b"hello", "text/plain")},
        )
    assert response.status_code == 400
    app.dependency_overrides.pop(get_db, None)


async def test_photo_remove_endpoint(db, profile_user):
    user, _ = profile_user
    headers = await _auth_headers(db, user)
    async with _asgi_client(db) as client:
        uploaded = await client.post(
            "/api/users/me/photo",
            headers=headers,
            files={"photo": ("me.jpg", JPEG_BYTES, "image/jpeg")},
        )
        assert uploaded.status_code == 200
        removed = await client.delete("/api/users/me/photo", headers=headers)
    assert removed.status_code == 200
    assert removed.json()["avatar_url"] is None
    app.dependency_overrides.pop(get_db, None)


async def test_patch_profile_name(db, profile_user):
    user, _ = profile_user
    headers = await _auth_headers(db, user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me", headers=headers, json={"name": "New Name"}
        )
    assert response.status_code == 200
    assert response.json()["user"]["name"] == "New Name"
    app.dependency_overrides.pop(get_db, None)


async def test_patch_profile_rejects_empty_name(db, profile_user):
    user, _ = profile_user
    headers = await _auth_headers(db, user)
    async with _asgi_client(db) as client:
        response = await client.patch(
            "/api/users/me", headers=headers, json={"name": "   "}
        )
    assert response.status_code == 400
    app.dependency_overrides.pop(get_db, None)
