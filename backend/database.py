"""
JodTod Authentication Backend
Production SQLAlchemy database infrastructure.

Design:
    - SQLAlchemy 2.x async engine/session
    - Explicit transaction boundaries
    - Connection-liveness strategy that costs no per-request round trip
    - FastAPI-friendly dependency
    - No application-level global DB session

Connection-liveness strategy
---------------------------
The database sits ~185 ms RTT away (Supabase pooler, Tokyo), so every
extra round trip is expensive. SQLAlchemy's ``pool_pre_ping`` issues an
extra ``SELECT 1`` on EVERY session checkout: measured p50 checkout cost
was 1394 ms with pre-ping versus 785 ms without (~610 ms per request).

``pool_pre_ping`` is therefore off by default. Stale connections are
still handled correctly, by three mechanisms that cost nothing in the
normal path:

    1. ``pool_recycle`` (database_pool_recycle_seconds) retires pooled
       connections before the server or pooler can drop them as idle.
    2. SQLAlchemy itself invalidates a pooled connection when a
       statement fails with a disconnect error, so a broken socket is
       never handed back out.
    3. The authentication read — the first statement of every
       authenticated request and the statement most exposed to a
       long-idle pooled connection — retries once on a disconnect via
       is_disconnect_error().

Set DATABASE_POOL_PRE_PING=true only for a deployment where a failed
request is cheaper than a failed login (for example a trusted, low-RTT
network), never for the current high-RTT topology.
"""

from __future__ import annotations

import asyncio
import logging
import socket
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.config import settings

logger = logging.getLogger(__name__)


def _normalize_database_url(url: str) -> str:
    """
    Normalize common PostgreSQL URLs to an asyncpg SQLAlchemy URL.

    Accepted examples:
        postgresql://...
        postgresql+asyncpg://...
        postgres://...
    """
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://") :]

    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://") :]

    return url


DATABASE_URL = _normalize_database_url(
    settings.database_url.get_secret_value()
)

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=settings.database_echo,
    pool_pre_ping=settings.database_pool_pre_ping,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout_seconds,
    pool_recycle=settings.database_pool_recycle_seconds,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency.

    The dependency owns the session lifecycle. A successful request commits
    only when the endpoint/service explicitly commits; otherwise it rolls
    back on failure and always closes the session.

    Recommended service pattern:
        async with transaction(db):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def transaction(
    session: AsyncSession,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Explicit transaction boundary for multi-step operations.

    The first transaction() call on a given session owns the transaction:
    it begins, commits on success, and rolls back on any exception.

    Nested calls on the same session participate in the already-open
    transaction instead of calling begin() again (which would raise
    "A transaction is already begun on this Session"); the outermost
    owner performs the final commit/rollback so the whole operation
    stays atomic.

    Note: the session's first SQL statement autobegins a transaction, so
    a write must happen inside the outermost transaction() rather than
    before it, otherwise it would join a transaction nobody commits.

    For a write on a session that ALREADY holds an autobegun transaction
    (an authenticated request sharing the auth session), use
    write_transaction() instead.
    """
    owns_transaction = not session.in_transaction()
    try:
        if owns_transaction:
            async with session.begin():
                yield session
        else:
            yield session
    except Exception:
        if owns_transaction:
            # session.begin() normally handles this itself; explicit
            # rollback keeps the contract clear if the implementation
            # is changed later.
            await session.rollback()
        raise


@asynccontextmanager
async def write_transaction(
    session: AsyncSession,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Commit-atomic boundary for a session that may ALREADY hold an
    autobegun transaction.

    An authenticated request reuses one session for the whole request
    (see get_db and dependencies/auth.py), so by the time a write
    endpoint runs, the session's first statement has already
    autobegun a transaction. ``transaction()`` correctly refuses to
    own that transaction, which means it must not be used to commit a
    write on such a session.

    write_transaction() commits the session's current transaction
    unconditionally on success and rolls it back on any exception, so a
    write endpoint keeps a real commit while still sharing the single
    per-request session.
    """
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise


async def check_database_connection() -> None:
    """Fail fast if the database is unavailable."""
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


# ============================================================
# STALE-CONNECTION RECOVERY
# ============================================================

# Substrings that identify a broken/closed socket rather than a query or
# constraint problem. Kept as literal fragments because asyncpg and psycopg
# expose different exception classes for the same condition.
_DISCONNECT_MARKERS = (
    "connection is closed",
    "connection already closed",
    "connection does not exist",
    "connection was closed",
    "connection not open",
    "server closed the connection",
    "terminating connection",
    "the connection is lost",
    "connection reset",
    "connection was lost",
    "connection is closed",
    "closed transport",
    "no connection available",
    "cannot operate on a closed database",
    "ssl connection has been closed",
    "socket closed",
)


def is_disconnect_error(exc: BaseException) -> bool:
    """
    True when an exception means "the pooled connection is no longer
    usable", i.e. the request may be safely retried on a fresh
    connection.

    Used together with ``pool_recycle`` to replace ``pool_pre_ping``:
    recovering from a stale socket then costs one round trip only in
    the rare failure case, instead of one round trip on every request.

    SQLAlchemy already marks such exceptions as disconnects and
    invalidates the pooled connection, so a retry reuses the pool
    with a freshly opened socket rather than the broken one.
    """
    if isinstance(exc, DBAPIError) and exc.connection_invalidated:
        return True

    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))

        name = type(current).__name__.lower()
        if any(
            marker in name
            for marker in (
                "disconnect",
                "interfaceerror",
                "connectiondoesnotexist",
                "connectiondoesnoteexist",
                "connectionreseterror",
                "brokenpipeerror",
            )
        ):
            return True

        message = str(current).lower()
        if any(marker in message for marker in _DISCONNECT_MARKERS):
            return True

        cause = current.__cause__ or current.__context__
        current = cause if isinstance(cause, BaseException) else None

    return False


async def initialize_database(
    max_retries: int = 5,
    base_delay_seconds: float = 1.0,
) -> None:
    """
    Perform non-destructive database initialization checks.

    Schema creation should normally be handled by Alembic migrations in
    staging/production rather than Base.metadata.create_all().

    Retries transient startup failures (e.g. DNS ``getaddrinfo failed``
    when the network/DNS is briefly unavailable) with exponential
    backoff instead of failing the whole application on a single blip.
    The last error is re-raised if all attempts fail.
    """
    last_error: BaseException | None = None
    for attempt in range(1, max_retries + 1):
        try:
            await check_database_connection()
            if attempt > 1:
                logger.info(
                    "Database connection established on attempt %d/%d.",
                    attempt,
                    max_retries,
                )
            return
        except socket.gaierror as exc:
            # Windows reports this as [Errno 11001] getaddrinfo failed:
            # the DB hostname could not be resolved (no network, VPN,
            # firewall, or transient DNS failure).
            last_error = exc
            logger.warning(
                "Database hostname could not be resolved "
                "(attempt %d/%d): %s. Check network/DNS access to "
                "the database host.",
                attempt,
                max_retries,
                exc,
            )
        except Exception as exc:  # noqa: BLE001 - retried then re-raised
            last_error = exc
            logger.warning(
                "Database connection failed (attempt %d/%d): %s: %s",
                attempt,
                max_retries,
                type(exc).__name__,
                exc,
            )
        if attempt < max_retries:
            await asyncio.sleep(base_delay_seconds * (2 ** (attempt - 1)))
    assert last_error is not None  # for type checkers
    raise last_error


async def dispose_database() -> None:
    """Release all pooled database connections during application shutdown."""
    await engine.dispose()


async def ping_database() -> bool:
    """Return database health without exposing connection details."""
    try:
        await check_database_connection()
        return True
    except Exception:
        return False


__all__ = [
    "DATABASE_URL",
    "AsyncSessionLocal",
    "engine",
    "get_db",
    "transaction",
    "write_transaction",
    "is_disconnect_error",
    "check_database_connection",
    "initialize_database",
    "dispose_database",
    "ping_database",
]
