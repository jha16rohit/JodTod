"""
JodTod Authentication Backend
Production SQLAlchemy database infrastructure.

Design:
    - SQLAlchemy 2.x async engine/session
    - Explicit transaction boundaries
    - Connection-pool health checks
    - FastAPI-friendly dependency
    - No application-level global DB session
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.config import settings


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

    Any exception causes rollback. Successful completion commits.
    """
    try:
        async with session.begin():
            yield session
    except Exception:
        # session.begin() normally handles this itself; explicit rollback
        # keeps the contract clear if the implementation is changed later.
        await session.rollback()
        raise


async def check_database_connection() -> None:
    """Fail fast if the database is unavailable."""
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def initialize_database() -> None:
    """
    Perform non-destructive database initialization checks.

    Schema creation should normally be handled by Alembic migrations in
    staging/production rather than Base.metadata.create_all().
    """
    await check_database_connection()


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
    "check_database_connection",
    "initialize_database",
    "dispose_database",
    "ping_database",
]
