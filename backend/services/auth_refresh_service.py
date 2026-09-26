"""
JodTod Authentication - Refresh Service.

Responsibilities:
    - Resolve the session behind a presented refresh token.
    - Rotate the pair via SessionService (reuse of a rotated token
      revokes the whole token family).
    - Return the new TokenResponse; only hashes touch the database.

Important:
    - The family-revocation side effect of reuse detection must be
      COMMITTED even though detection surfaces as an error, so commit
      handling here is explicit rather than transaction()-scoped.
    - All failures share one generic message (no oracle for attackers).
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import hash_token
from backend.models.session import Session
from backend.schemas.auth import TokenResponse
from backend.services.session_service import (
    InvalidSessionError,
    RefreshTokenReuseError,
    SessionService,
)


# ++++++++++++++++ EXCEPTIONS ++++++++++++++++
class RefreshError(Exception):
    """Generic refresh failure (safe message, no oracle)."""

    code = "INVALID_REFRESH_TOKEN"
    status_code = 401

    def __init__(
        self,
        message: str = "Session expired. Please log in again.",
    ) -> None:
        self.message = message
        super().__init__(message)


# ++++++++++++++++ REFRESH ++++++++++++++++
async def refresh_tokens(
    db: AsyncSession,
    raw_refresh_token: str,
    session_id: UUID | None = None,
) -> TokenResponse:
    """
    Rotate a refresh token and issue a new access token.

    When session_id is supplied the session is loaded by id, which
    enables full rotation-reuse detection; otherwise the session is
    resolved by token hash. Raises RefreshError for every failure.
    """
    if not raw_refresh_token:
        raise RefreshError()

    try:
        if session_id is not None:
            session = await SessionService.get_by_id(db, session_id)
        else:
            session = await db.scalar(
                select(Session).where(
                    Session.refresh_token_hash
                    == hash_token(raw_refresh_token)
                )
            )

        if session is None:
            raise RefreshError()

        data = await SessionService.rotate_refresh_token(
            db,
            session,
            raw_refresh_token,
        )
        await db.commit()
    except RefreshTokenReuseError as exc:
        # Persist the family revocation, then fail closed.
        await db.commit()
        raise RefreshError() from exc
    except RefreshError:
        await db.rollback()
        raise
    except InvalidSessionError as exc:
        await db.rollback()
        raise RefreshError() from exc
    except Exception as exc:  # noqa: BLE001 - fail closed, stay generic
        await db.rollback()
        raise RefreshError() from exc

    return TokenResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        token_type="bearer",
        expires_in=data["expires_in"],
        refresh_expires_in=data["refresh_expires_in"],
        session_id=data["session_id"],
    )
