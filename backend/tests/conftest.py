"""
Test configuration.

Environment variables MUST be set before any backend import happens,
because backend.config instantiates Settings at import time.
"""

from __future__ import annotations

import os

os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "true"
os.environ["DATABASE_URL"] = (
    "postgresql+asyncpg://postgres@localhost:55432/jodtod_test"
)
os.environ["JWT_SECRET_KEY"] = (
    "scratch-test-secret-key-0123456789-abcdefghijklmnopqrstuvwxyz"
)
os.environ["OTP_PROVIDER"] = "mock"
os.environ["EMAIL_PROVIDER"] = "mock"

import pytest_asyncio
from sqlalchemy import text

from backend.database import AsyncSessionLocal, check_database_connection


@pytest_asyncio.fixture
async def db():
    """
    Provide a clean async session. Tables are truncated before each test
    via a lightweight SQL statement.
    """
    async with AsyncSessionLocal() as session:
        # Truncate all auth tables before the test runs.
        await session.execute(text(
            "TRUNCATE email_verifications, otp_records, "
            "password_resets, sessions, users "
            "RESTART IDENTITY CASCADE"
        ))
        await session.commit()
        yield session


@pytest_asyncio.fixture
async def db_ready() -> None:
    """Assert the scratch database is reachable."""
    await check_database_connection()
    yield