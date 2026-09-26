"""
Tests for backend.dependencies.auth (authentication dependency layer).
"""

import pytest
from fastapi import HTTPException

from backend.core.jwt import create_access_token
from backend.dependencies.auth import (
    authentication_error,
    get_current_session,
    get_current_user,
    require_active_user,
)
from backend.models.user import AccountStatus, User
from backend.services.session_service import SessionService


async def _user_with_session(db, status=AccountStatus.ACTIVE):
    user = User(
        name="Dep User",
        email="dep-user@example.com",
        password_hash="hash",
        account_status=status,
        is_active=(status == AccountStatus.ACTIVE),
    )
    db.add(user)
    await db.flush()

    session, token_data = await SessionService.create_session(db, user)
    await db.flush()
    return user, session, token_data


def test_authentication_error_is_401():
    exc = authentication_error()
    assert exc.status_code == 401
    assert exc.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.asyncio
async def test_get_current_session_from_valid_token(db):
    user, session, token_data = await _user_with_session(db)
    auth_session = await get_current_session(
        token=token_data["access_token"],
        db=db,
    )
    assert auth_session.id == session.id
    assert auth_session.user_id == user.id


@pytest.mark.asyncio
async def test_get_current_session_rejects_bad_token(db):
    user, session, token_data = await _user_with_session(db)
    with pytest.raises(HTTPException) as exc_info:
        await get_current_session(token="not-a-jwt", db=db)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_session_rejects_wrong_user_session(db):
    user, session, token_data = await _user_with_session(db)

    other_user = User(
        name="Other",
        email="other@example.com",
        password_hash="hash",
        account_status=AccountStatus.ACTIVE,
    )
    db.add(other_user)
    await db.flush()

    # Token claims a session that does not belong to that user_id.
    from uuid import uuid4

    tampered = create_access_token(
        user_id=str(uuid4()),
        session_id=str(session.id),
    )
    with pytest.raises(HTTPException) as exc_info:
        await get_current_session(token=tampered, db=db)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_session_rejects_revoked_session(db):
    user, session, token_data = await _user_with_session(db)
    await SessionService.revoke_session(db, session, reason="logout")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_session(
            token=token_data["access_token"],
            db=db,
        )
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(db):
    user, session, token_data = await _user_with_session(db)
    current_user = await get_current_user(
        session=session,
        db=db,
    )
    assert current_user.id == user.id


@pytest.mark.asyncio
async def test_require_active_user_accepts_active(db):
    user, session, _ = await _user_with_session(
        db, status=AccountStatus.ACTIVE
    )
    assert (await require_active_user(user)) is user


@pytest.mark.asyncio
async def test_require_active_user_forbids_inactive(db):
    user, session, _ = await _user_with_session(
        db, status=AccountStatus.SUSPENDED
    )
    with pytest.raises(HTTPException) as exc_info:
        await require_active_user(user)
    assert exc_info.value.status_code == 403