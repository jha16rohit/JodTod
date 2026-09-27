"""
Tests for Page 07: linked accounts (status / link / unlink).

Real cryptography without network: Google ID tokens are genuinely
RS256-signed in-test and verified through the production
verify_google_id_token path with an injected test key (same pattern
as test_oauth.py). The route-level verify function is monkeypatched
to inject that key — the signature/issuer/audience/expiry checks
still run for every token.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx
import jwt
import pytest
import pytest_asyncio
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import delete

import backend.routes.linked_accounts as linked_routes
from backend.config import settings
from backend.database import get_db
from backend.main import app
from backend.models.user import AccountStatus, User
from backend.services.auth_oauth_service import verify_google_id_token
from backend.services.provider_link_service import ProviderLinkService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def link_user(db):
    user = User(
        name="Link User",
        email="link-user@example.com",
        phone="+91 90000 00011",
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=True,
    )
    db.add(user)
    await db.flush()
    yield user
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()


@pytest_asyncio.fixture
async def link_other(db):
    user = User(
        name="Link Other",
        email="link-other@example.com",
        phone=None,
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
        email_verified=True,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    yield user
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()


@pytest.fixture
def rsa_keys():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


def _google_token(private_key, **overrides):
    now = datetime.now(timezone.utc)
    audience = settings.google_client_id or "test-google-client-id"
    claims = {
        "iss": "https://accounts.google.com",
        "aud": audience,
        "sub": "google-subject-abc",
        "email": "actual-google-user@gmail.com",
        "email_verified": True,
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "name": "Google User",
    }
    claims.update(overrides)
    return jwt.encode(claims, private_key, algorithm="RS256"), audience


@pytest.fixture
def verify_with_test_key(rsa_keys, monkeypatch):
    """Route verification using the REAL checks + injected test key."""
    _, public_key = rsa_keys

    def _verify(id_token: str):
        return verify_google_id_token(
            id_token, key_fetcher=lambda _: public_key
        )

    monkeypatch.setattr(linked_routes, "verify_google_id_token", _verify)
    if not (settings.google_client_id or "").strip():
        monkeypatch.setattr(
            settings, "google_client_id", "test-google-client-id"
        )
    return _verify


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
# Status: real state, auth required, no secrets/subjects leaked
# ---------------------------------------------------------------------------

async def test_status_requires_auth(db, link_user):
    async with _asgi_client(db) as client:
        response = await client.get("/api/users/me/linked-accounts")
    assert response.status_code == 401
    app.dependency_overrides.pop(get_db, None)


async def test_status_reflects_real_state(db, link_user):
    headers = await _auth_headers(db, link_user)
    async with _asgi_client(db) as client:
        response = await client.get(
            "/api/users/me/linked-accounts", headers=headers
        )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == {
        "connected": True,
        "email": "link-user@example.com",
        "verified": True,
    }
    assert body["phone"]["connected"] is True
    assert body["phone"]["phone"] == "+91 90000 00011"
    assert body["google"]["connected"] is False
    assert body["google"]["email"] is None
    assert body["apple"]["connected"] is False
    assert body["apple"]["email"] is None
    assert body["facebook"] == {"connected": False, "available": False}
    flat = str(body)
    assert "google-subject" not in flat and "hash" not in flat
    app.dependency_overrides.pop(get_db, None)


def test_linked_state_pure():
    from types import SimpleNamespace

    user = SimpleNamespace(
        email=None, email_verified=False, phone=None,
        phone_verified=False, google_subject=None, google_email=None,
        google_linked_at=None, apple_subject="a1", apple_email="a@x.com",
        apple_linked_at=None,
    )
    state = ProviderLinkService.linked_state(user)
    assert state["email"] == {
        "connected": False, "email": None, "verified": False
    }
    assert state["apple"]["connected"] is True
    assert state["apple"]["email"] == "a@x.com"


# ---------------------------------------------------------------------------
# Link: real verified token, no new user, conflicts safe
# ---------------------------------------------------------------------------

async def test_link_google_with_verified_token(
    db, link_user, rsa_keys, verify_with_test_key
):
    private_key, _ = rsa_keys
    token, _ = _google_token(private_key)
    headers = await _auth_headers(db, link_user)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/users/me/linked-accounts/google/link",
            headers=headers,
            json={"id_token": token},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["google"]["connected"] is True
    assert body["google"]["email"] == "actual-google-user@gmail.com"
    assert body["google"]["connected_at"] is not None
    assert body["google"]["last_verified_at"] is not None
    # Same JodTod user — canonical email untouched, no second user.
    await db.refresh(link_user)
    assert link_user.email == "link-user@example.com"
    assert link_user.google_subject == "google-subject-abc"
    assert link_user.google_linked_at is not None
    app.dependency_overrides.pop(get_db, None)


async def test_relink_is_idempotent(
    db, link_user, rsa_keys, verify_with_test_key
):
    """Linking twice converges: 200, one link, refreshed timestamps."""
    private_key, _ = rsa_keys
    token, _ = _google_token(private_key)
    headers = await _auth_headers(db, link_user)
    async with _asgi_client(db) as client:
        first = await client.post(
            "/api/users/me/linked-accounts/google/link",
            headers=headers,
            json={"id_token": token},
        )
        second = await client.post(
            "/api/users/me/linked-accounts/google/link",
            headers=headers,
            json={"id_token": token},
        )
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["google"]["connected"] is True
    await db.refresh(link_user)
    assert link_user.google_subject == "google-subject-abc"
    app.dependency_overrides.pop(get_db, None)


async def test_unlink_clears_timestamps(
    db, link_user, rsa_keys, verify_with_test_key
):
    private_key, _ = rsa_keys
    token, _ = _google_token(private_key)
    headers = await _auth_headers(db, link_user)
    async with _asgi_client(db) as client:
        linked = await client.post(
            "/api/users/me/linked-accounts/google/link",
            headers=headers,
            json={"id_token": token},
        )
        assert linked.status_code == 200
        unlinked = await client.delete(
            "/api/users/me/linked-accounts/google/unlink", headers=headers
        )
    assert unlinked.json()["google"]["connected_at"] is None
    await db.refresh(link_user)
    assert link_user.google_linked_at is None
    assert link_user.google_email is None
    app.dependency_overrides.pop(get_db, None)


async def test_link_rejects_forged_token(
    db, link_user, rsa_keys, verify_with_test_key
):
    other_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048
    )
    token, _ = _google_token(other_key)
    headers = await _auth_headers(db, link_user)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/users/me/linked-accounts/google/link",
            headers=headers,
            json={"id_token": token},
        )
    assert response.status_code == 401
    await db.refresh(link_user)
    assert link_user.google_subject is None
    app.dependency_overrides.pop(get_db, None)


async def test_link_conflict_when_owned_by_other(
    db, link_user, link_other, rsa_keys, verify_with_test_key
):
    private_key, _ = rsa_keys
    token, _ = _google_token(private_key)
    other_headers = await _auth_headers(db, link_other)
    async with _asgi_client(db) as client:
        first = await client.post(
            "/api/users/me/linked-accounts/google/link",
            headers=other_headers,
            json={"id_token": token},
        )
        assert first.status_code == 200
        mine = await client.post(
            "/api/users/me/linked-accounts/google/link",
            headers=await _auth_headers(db, link_user),
            json={"id_token": token},
        )
    assert mine.status_code == 409
    await db.refresh(link_user)
    await db.refresh(link_other)
    assert link_user.google_subject is None
    assert link_other.google_subject == "google-subject-abc"
    app.dependency_overrides.pop(get_db, None)


async def test_link_unsupported_provider(db, link_user):
    headers = await _auth_headers(db, link_user)
    async with _asgi_client(db) as client:
        response = await client.post(
            "/api/users/me/linked-accounts/facebook/link",
            headers=headers,
            json={"id_token": "whatever-token-value-here"},
        )
    assert response.status_code in (404, 422)
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Unlink: guard blocks last-method removal, canonical data preserved
# ---------------------------------------------------------------------------

async def test_unlink_guards_last_method(db, link_user):
    link_user.password_hash = None
    link_user.phone = None
    link_user.google_subject = "g-only"
    link_user.google_email = "g@x.com"
    await db.flush()
    assert ProviderLinkService.remaining_methods(link_user) == ["google"]

    headers = await _auth_headers(db, link_user)
    async with _asgi_client(db) as client:
        blocked = await client.delete(
            "/api/users/me/linked-accounts/google/unlink", headers=headers
        )
    assert blocked.status_code == 409
    await db.refresh(link_user)
    assert link_user.google_subject == "g-only"
    app.dependency_overrides.pop(get_db, None)


async def test_unlink_not_linked_is_idempotent(db, link_user):
    headers = await _auth_headers(db, link_user)
    async with _asgi_client(db) as client:
        response = await client.delete(
            "/api/users/me/linked-accounts/google/unlink", headers=headers
        )
    assert response.status_code == 200
    assert response.json()["google"]["connected"] is False
    app.dependency_overrides.pop(get_db, None)


async def test_unlink_allowed_with_backup_method(
    db, link_user, rsa_keys, verify_with_test_key
):
    private_key, _ = rsa_keys
    token, _ = _google_token(private_key)
    headers = await _auth_headers(db, link_user)
    async with _asgi_client(db) as client:
        linked = await client.post(
            "/api/users/me/linked-accounts/google/link",
            headers=headers,
            json={"id_token": token},
        )
        assert linked.status_code == 200
        unlinked = await client.delete(
            "/api/users/me/linked-accounts/google/unlink", headers=headers
        )
    assert unlinked.status_code == 200
    assert unlinked.json()["google"]["connected"] is False
    assert unlinked.json()["google"]["email"] is None
    await db.refresh(link_user)
    assert link_user.google_subject is None
    assert link_user.google_email is None
    # Canonical identity untouched.
    assert link_user.email == "link-user@example.com"
    assert link_user.phone == "+91 90000 00011"
    app.dependency_overrides.pop(get_db, None)
