"""
Tests for backend.database: connection, transactions, lifecycle.
"""

import pytest
from contextlib import asynccontextmanager

from backend.database import (
    check_database_connection,
    ping_database,
    transaction,
)
from backend.models.user import User


class _FakeSession:
    """Minimal AsyncSession stand-in for transaction() ownership tests.

    Mirrors begin/commit/rollback state transitions without a database
    connection. begin() is an async context manager that commits on
    success and rolls back on exception, like session.begin().
    """

    def __init__(self) -> None:
        self.open = False
        self.commits = 0
        self.rollbacks = 0

    def in_transaction(self) -> bool:
        return self.open

    @asynccontextmanager
    async def begin(self):
        self.open = True
        try:
            yield self
        except Exception:
            self.open = False
            self.rollbacks += 1
            raise
        else:
            self.open = False
            self.commits += 1

    async def commit(self) -> None:
        """No-op: commit() outside the begin() owner is quiet, like SQLAlchemy."""

    async def rollback(self) -> None:
        """No-op: rollback() outside the begin() owner is quiet, like SQLAlchemy."""


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


@pytest.mark.asyncio
async def test_transaction_top_level_commits_once():
    fake = _FakeSession()
    async with transaction(fake):
        pass
    assert fake.commits == 1
    assert fake.rollbacks == 0


@pytest.mark.asyncio
async def test_transaction_nested_participates_without_new_begin():
    # The login flow nests request_email_login_otp -> request_otp inside
    # login_with_password's transaction. Nested transaction() calls must
    # join the open transaction, not call begin() again, and own nothing.
    fake = _FakeSession()
    async with transaction(fake):
        async with transaction(fake):
            async with transaction(fake):
                pass
    assert fake.commits == 1
    assert fake.rollbacks == 0
    assert fake.open is False


@pytest.mark.asyncio
async def test_transaction_inner_failure_rolled_back_by_outer():
    # An exception raised by a nested service must propagate to the
    # outermost owner, which rolls back everything atomically (e.g. OTP
    # persistence when the SMTP provider rejects delivery).
    fake = _FakeSession()
    with pytest.raises(RuntimeError):
        async with transaction(fake):
            async with transaction(fake):
                raise RuntimeError("boom")
    assert fake.rollbacks == 1
    assert fake.commits == 0
    assert fake.open is False