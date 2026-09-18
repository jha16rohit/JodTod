"""
Tests for user_service against the scratch DB.
"""

import pytest

from backend.models.user import AccountStatus, User
from backend.schemas.user import UserCreate
from backend.services.user_service import (
    DuplicateAccountError,
    InactiveAccountError,
    UserService,
)


def _create_data(email="alice@example.com", phone=None, name="Alice"):
    return UserCreate(
        name=name,
        email=email,
        phone=phone,
        password="SuperSecret99!",
    )


async def test_create_user_hashes_password(db):
    data = _create_data()
    user = await UserService.create_user(db, data)

    assert user.password_hash is not None
    assert user.password_hash != data.password
    assert "SuperSecret99!" not in user.password_hash
    assert user.email == "alice@example.com"
    assert user.account_status == AccountStatus.ACTIVE
    assert user.email_verified is False
    assert user.phone_verified is False


async def test_create_user_normalizes_email(db):
    data = _create_data(email="  Alice@Example.COM  ")
    user = await UserService.create_user(db, data)
    assert user.email == "alice@example.com"


async def test_duplicate_email_raises(db):
    await UserService.create_user(db, _create_data(email="dup@example.com"))
    with pytest.raises(DuplicateAccountError):
        await UserService.create_user(
            db, _create_data(email="DUP@example.com")
        )


async def test_duplicate_phone_raises(db):
    await UserService.create_user(
        db, _create_data(email=None, phone="+15551234567")
    )
    with pytest.raises(DuplicateAccountError):
        await UserService.create_user(
            db,
            _create_data(email="someone@example.com", phone="+15551234567"),
        )


async def test_create_user_requires_identifier(db):
    with pytest.raises(ValueError):
        await UserService.create_user(
            db, _create_data(email=None, phone=None)
        )


async def test_create_user_requires_password(db):
    data = UserCreate(name="NoPass", email="nopass@example.com")
    with pytest.raises(ValueError):
        await UserService.create_user(db, data)


async def test_get_by_identifier_email(db):
    await UserService.create_user(db, _create_data(email="lookup@example.com"))
    user = await UserService.get_by_identifier(
        db, "LOOKUP@example.com"
    )
    assert user is not None
    assert user.email == "lookup@example.com"


async def test_get_by_identifier_phone(db):
    await UserService.create_user(
        db, _create_data(email=None, phone="+14445556667")
    )
    user = await UserService.get_by_identifier(db, "+14445556667")
    assert user is not None
    assert user.phone == "+14445556667"


async def test_get_by_id(db):
    created = await UserService.create_user(db, _create_data())
    found = await UserService.get_by_id(db, created.id)
    assert found is not None
    assert found.id == created.id


async def test_is_active_and_ensure_active(db):
    user = await UserService.create_user(db, _create_data())
    assert UserService.is_active(user) is True
    UserService.ensure_active(user)

    user.account_status = AccountStatus.SUSPENDED
    assert UserService.is_active(user) is False
    with pytest.raises(InactiveAccountError):
        UserService.ensure_active(user)


async def test_update_profile(db):
    user = await UserService.create_user(db, _create_data(name="Old"))
    updated = await UserService.update_profile(db, user, name="  New  ")
    assert updated.name == "New"

    with pytest.raises(ValueError):
        await UserService.update_profile(db, user, name="   ")


async def test_model_imports_consistency():
    from backend.models.user import AccountStatus as AS

    assert AS.ACTIVE.value == "active"
    assert AS.SUSPENDED.value == "suspended"