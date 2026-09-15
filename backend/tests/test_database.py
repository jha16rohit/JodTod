"""
Tests for backend.database: connection, transactions, lifecycle.
"""

import pytest

from backend.database import (
    check_database_connection,
    ping_database,
    transaction,
)
from backend.models.user import User


@pytest.mark.asyncio
async def test_check_database_connection_succeeds(db_ready):
    await check_database_connection()


@pytest.mark.asyncio
async def test_ping_database_true_when_connected(db_ready):
    assert await ping_database() is True


@pytest.mark.asyncio
async def test_transaction_commits_success(db):
    async with transaction(db):
        db.add(User(name="committed", email=None, phone=None))
        await db.flush()

    # Data must persist after the transaction commits.
    from sqlalchemy import select

    users = (await db.scalars(select(User))).all()
    assert len(users) == 1
    assert users[0].name == "committed"


@pytest.mark.asyncio
async def test_transaction_rolls_back_on_error(db):
    with pytest.raises(RuntimeError):
        async with transaction(db):
            db.add(User(name="should-rollback", email=None, phone=None))
            await db.flush()
            raise RuntimeError("boom")

    from sqlalchemy import select

    users = (await db.scalars(select(User))).all()
    assert len(users) == 0