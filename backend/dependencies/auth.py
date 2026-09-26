# backend/dependencies/auth.py

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.jwt import (
    JWTError,
    get_session_id_from_token,
    get_user_id_from_token,
)
from backend.database import get_db
from backend.models.session import Session as UserSession
from backend.models.user import User
from backend.services.session_service import SessionService
from backend.services.user_service import (
    InactiveAccountError,
    UserService,
)


# ============================================================
# SECURITY SCHEME
# ============================================================

bearer_scheme = HTTPBearer(
    auto_error=False
)


# ============================================================
# AUTHENTICATION ERROR
# ============================================================

def authentication_error(
    detail: str = "Authentication required.",
) -> HTTPException:
    """
    Create a standard 401 authentication exception.
    """

    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )


# ============================================================
# GET BEARER TOKEN
# ============================================================

def get_bearer_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> str:
    """
    Extract the raw Bearer access token from the request.
    """

    if credentials is None:
        raise authentication_error()

    if credentials.scheme.lower() != "bearer":
        raise authentication_error(
            "Invalid authentication scheme."
        )

    if not credentials.credentials:
        raise authentication_error()

    return credentials.credentials


# ============================================================
# GET CURRENT SESSION
# ============================================================

async def get_current_session(
    token: Annotated[
        str,
        Depends(get_bearer_token),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> UserSession:
    """
    Validate the JWT and resolve the corresponding database
    authentication session.
    """

    try:
        user_id = get_user_id_from_token(token)
        session_id = get_session_id_from_token(token)

    except JWTError:
        raise authentication_error(
            "Invalid or expired access token."
        )

    session = await SessionService.get_user_session(
        db=db,
        user_id=user_id,
        session_id=session_id,
    )

    if session is None:
        raise authentication_error(
            "Authentication session not found."
        )

    if not SessionService.is_valid(session):
        raise authentication_error(
            "Authentication session is expired or revoked."
        )

    return session


# ============================================================
# GET CURRENT USER
# ============================================================

async def get_current_user(
    session: Annotated[
        UserSession,
        Depends(get_current_session),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> User:
    """
    Resolve the user associated with the authenticated session.
    """

    user = await UserService.get_by_id(
        db=db,
        user_id=session.user_id,
    )

    if user is None:
        raise authentication_error(
            "Authenticated user not found."
        )

    return user


# ============================================================
# GET USER + SESSION
# ============================================================

async def get_current_user_and_session(
    session: Annotated[
        UserSession,
        Depends(get_current_session),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> tuple[User, UserSession]:
    """
    Resolve both authenticated user and session.

    Useful when an endpoint needs:
        - user information
        - device/session information
    """

    user = await UserService.get_by_id(
        db=db,
        user_id=session.user_id,
    )

    if user is None:
        raise authentication_error(
            "Authenticated user not found."
        )

    return user, session


# ============================================================
# REQUIRE ACTIVE USER
# ============================================================

async def require_active_user(
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> User:
    """
    Require the authenticated account to be active.
    """

    try:
        UserService.ensure_active(user)

    except InactiveAccountError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active.",
        )

    return user