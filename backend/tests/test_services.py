"""
Tests for token_service and session_service against the scratch DB.
"""

import pytest

from backend.core.security import hash_token, verify_token
from backend.models.user import AccountStatus, User
from backend.services.session_service import (
    InvalidSessionError,
    RefreshTokenReuseError,
    SessionService,
)
from backend.services.token_service import TokenService
from backend.services.user_service import UserService
from backend.schemas.user import UserCreate


@pytest.fixture
def user_data() -> UserCreate:
    return UserCreate(
        name="Test User",
        email="test@example.com",
        phone=None,
        password="SecurePass123!",
    )


async def _create_user(db, email="test@example.com"):
    user = User(
        name="Test User",
        email=email,
        phone=None,
        password_hash=hash_token("x"),
        account_status=AccountStatus.ACTIVE,
        email_verified=False,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()
    return user


async def test_create_session_returns_valid_pair(db, user_data):
    user = await UserService.create_user(db, user_data)
    session, token_data = await SessionService.create_session(
        db,
        user,
        device_id="device-1",
    )

    assert session.id is not None  # id exists
    assert session.is_active is True
    assert session.revoked_at is None
    assert session.token_family_id is not None
    assert token_data["refresh_token_hash"] == session.refresh_token_hash
    assert verify_token(
        token_data["refresh_token"],
        session.refresh_token_hash,
    )
    assert session.refresh_token_hash != token_data["refresh_token"]


async def test_create_session_requires_flush(db, user_data):
    user = await UserService.create_user(db, user_data)
    session, token_data = await SessionService.create_session(
        db, user, device_id="device-1"
    )
    fetched = await SessionService.get_by_id(db, session.id)
    assert fetched is not None
    assert fetched.user_id == user.id
    assert SessionService.is_valid(fetched) is True


async def test_rotate_refresh_token_reissues(db, user_data):
    user = await UserService.create_user(db, user_data)
    session, token_data = await SessionService.create_session(db, user)
    old_hash = session.refresh_token_hash

    rotated = await SessionService.rotate_refresh_token(
        db,
        session,
        token_data["refresh_token"],
    )

    assert rotated["refresh_token"] != token_data["refresh_token"]
    assert session.refresh_token_hash != old_hash
    assert verify_token(rotated["refresh_token"], session.refresh_token_hash)
    assert rotated["session_id"] == session.id


async def test_rotate_with_old_token_detects_reuse(db, user_data):
    user = await UserService.create_user(db, user_data)
    session, token_data = await SessionService.create_session(db, user)
    original_old_token = token_data["refresh_token"]

    rotated = await SessionService.rotate_refresh_token(
        db,
        session,
        token_data["refresh_token"],
    )
    assert rotated["session_id"] == session.id
    assert token_data["refresh_token"] != rotated["refresh_token"]

    # Presenting the OLD pre-rotation token after rotation => reuse
    with pytest.raises(RefreshTokenReuseError):
        await SessionService.rotate_refresh_token(
            db,
            session,
            original_old_token,
        )

    # Family must now be fully revoked.
    await db.refresh(session)
    assert session.is_active is False
    assert session.revoked_at is not None
    assert session.revoke_reason == "refresh_token_reuse"


async def test_revoke_session_preserves_hash_and_marks_revoked(db, user_data):
    user = await UserService.create_user(db, user_data)
    session, token_data = await SessionService.create_session(db, user)

    await SessionService.revoke_session(db, session, reason="logout")

    assert session.is_active is False
    assert session.revoked_at is not None
    assert session.revoke_reason == "logout"
    # Hash remains as audit history (nullable=False column never nulled)
    assert session.refresh_token_hash is not None
    assert SessionService.is_valid(session) is False


async def test_revoke_by_id(db, user_data):
    user = await UserService.create_user(db, user_data)
    session, _ = await SessionService.create_session(db, user)

    assert await SessionService.revoke_by_id(db, session.id) is True
    assert await SessionService.revoke_by_id(db, session.id) is False  # no-op


async def test_revoke_all_user_sessions(db, user_data):
    user = await UserService.create_user(db, user_data)
    s1, _ = await SessionService.create_session(db, user, device_id="a")
    s2, _ = await SessionService.create_session(db, user, device_id="b")

    affected = await SessionService.revoke_all_user_sessions(db, user.id)
    assert affected == 2

    for s in (s1, s2):
        await db.refresh(s)
        assert s.is_active is False
        assert s.revoked_at is not None
        assert s.revoke_reason == "password_reset"


async def test_get_active_device_session(db, user_data):
    user = await UserService.create_user(db, user_data)
    session, _ = await SessionService.create_session(
        db, user, device_id="phone-1"
    )

    active = await SessionService.get_active_device_session(
        db, user.id, "phone-1"
    )
    assert active is not None
    assert active.id == session.id

    await SessionService.revoke_session(db, session, reason="logout")
    assert (
        await SessionService.get_active_device_session(
            db, user.id, "phone-1"
        )
        is None
    )


async def test_token_pair_fields():
    from datetime import datetime, timedelta, timezone
    from uuid import UUID, uuid4

    from backend.config import settings

    pair = TokenService.create_token_pair(
        user_id=uuid4(),
        session_id=uuid4(),
    )
    assert set(pair.keys()) == {
        "access_token",
        "refresh_token",
        "refresh_token_hash",
        "expires_in",
        "refresh_expires_in",
        "refresh_expires_at",
    }
    assert pair["access_token"].count(".") == 2
    assert pair["refresh_expires_in"] == (
        settings.refresh_token_expire_days * 24 * 60 * 60
    )
    assert pair["expires_in"] == (
        settings.access_token_expire_minutes * 60
    )
    assert isinstance(pair["refresh_expires_at"], datetime)
    assert isinstance(pair["refresh_token_hash"], str)


async def test_refresh_token_expiry_check(db):
    from datetime import datetime, timedelta, timezone

    future = datetime.now(timezone.utc) + timedelta(hours=1)
    past = datetime.now(timezone.utc) - timedelta(hours=1)

    assert TokenService.is_refresh_token_expired(future) is False
    assert TokenService.is_refresh_token_expired(past) is True
    # naive datetimes are treated as UTC
    assert TokenService.is_refresh_token_expired(past.replace(tzinfo=None)) is True


async def test_invalid_session_raises(db):
    user = await _create_user(db)
    session, _ = await SessionService.create_session(db, user)

    await SessionService.revoke_session(db, session, reason="logout")
    with pytest.raises(InvalidSessionError):
        await SessionService.rotate_refresh_token(
            db, session, "some-token"
        )