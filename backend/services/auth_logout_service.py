"""
JodTod Authentication - Logout Service

Responsibilities:
    - Revoke the authenticated device Session
    - Record revocation timestamp, active flag, and reason
    - Keep revocation idempotent (logging out twice is not an error)

Important:
    - Logout never deletes the User record.
    - The refresh-token hash is preserved for audit history;
      the session is invalidated through revoked_at/is_active.
    - This service contains business logic only.
    - FastAPI route handling belongs in auth_logout.py.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import transaction
from backend.models.session import Session
from backend.services.session_service import SessionService


# ++++++++++++++++ EXCEPTIONS ++++++++++++++++
class LogoutError(Exception):
    """Base class for logout failures."""

    code = "LOGOUT_ERROR"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class SessionNotFoundError(LogoutError):
    """Raised when an explicitly requested session does not belong to
    the authenticated user."""

    code = "SESSION_NOT_FOUND"


# ++++++++++++++++ LOGOUT ++++++++++++++++
async def logout_session(
    db: AsyncSession,
    *,
    user_id: UUID,
    session_id: UUID,
    reason: str = SessionService.REASON_LOGOUT,
) -> Session:
    """
    Revoke a single authenticated session belonging to a user.

    The session is resolved scoped to the user so one user can never
    revoke another user's session by guessing its ID.

    Revocation is idempotent: an already-revoked session is returned
    unchanged instead of raising.

    Raises:
        SessionNotFoundError: If no session with this ID belongs to
            the user.

    Returns:
        Session: The revoked (or already-revoked) session.
    """

    async with transaction(db):
        session = await SessionService.get_user_session(
            db=db,
            user_id=user_id,
            session_id=session_id,
        )

        if session is None:
            raise SessionNotFoundError("Session not found.")

        if session.revoked_at is not None or not session.is_active:
            return session

        await SessionService.revoke_session(
            db=db,
            session=session,
            reason=reason,
        )

        return session
