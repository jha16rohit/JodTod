# backend/core/jwt.py

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

import jwt as pyjwt

from backend.config import settings


class JWTError(Exception):
    """
    Raised whenever an access token is missing, malformed, expired,
    or fails any of the required-claim checks.
    """


# Reserved claims that callers are not allowed to override.
_RESERVED_CLAIMS = frozenset(
    {
        "sub",
        "sid",
        "type",
        "iat",
        "exp",
        "jti",
    }
)


# ============================================================
# CONFIGURATION (READ AT CALL TIME)
# ============================================================

def _secret_key() -> str:
    return settings.jwt_secret_key.get_secret_value()


def _algorithm() -> str:
    return settings.jwt_algorithm


# ============================================================
# TIME
# ============================================================

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ============================================================
# CREATE ACCESS TOKEN
# ============================================================

def create_access_token(
    user_id: UUID | str,
    session_id: UUID | str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[dict[str, Any]] = None,
) -> str:
    """
    Create a short-lived JWT access token.

    Claims:
        sub  = user ID
        sid  = authentication session ID
        type = access
        iat  = issued-at time
        exp  = expiration time
        jti  = unique JWT ID
    """

    now = _utc_now()

    if expires_delta is None:
        expires_delta = timedelta(
            minutes=settings.access_token_expire_minutes
        )

    expires_at = now + expires_delta

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "sid": str(session_id),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": str(uuid4()),
    }

    if extra_claims:
        for claim, value in extra_claims.items():
            if claim not in _RESERVED_CLAIMS:
                payload[claim] = value

    return pyjwt.encode(
        payload,
        _secret_key(),
        algorithm=_algorithm(),
    )


# ============================================================
# DECODE ACCESS TOKEN
# ============================================================

def decode_access_token(
    token: str,
) -> dict[str, Any]:
    """
    Decode and cryptographically validate an access token.

    JWTError is raised when:
    - signature is invalid
    - token is expired
    - token is malformed
    - required claims are missing
    - token type is incorrect
    """

    if not token:
        raise JWTError("Access token is required.")

    try:
        payload = pyjwt.decode(
            token,
            _secret_key(),
            algorithms=[_algorithm()],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": False,
                "verify_iss": False,
                "require": ["exp", "iat"],
            },
        )
    except pyjwt.PyJWTError:
        raise JWTError("Invalid or expired access token.")

    if payload.get("type") != "access":
        raise JWTError("Invalid token type.")

    if not payload.get("sub"):
        raise JWTError("Missing user ID claim.")

    if not payload.get("sid"):
        raise JWTError("Missing session ID claim.")

    if not payload.get("jti"):
        raise JWTError("Missing JWT ID claim.")

    return payload


# ============================================================
# GET USER ID
# ============================================================

def get_user_id_from_token(
    token: str,
) -> UUID:
    """
    Extract the user UUID from the JWT `sub` claim.
    """

    payload = decode_access_token(token)

    try:
        return UUID(str(payload["sub"]))
    except (ValueError, TypeError, KeyError):
        raise JWTError("Invalid user ID claim.")


# ============================================================
# GET SESSION ID
# ============================================================

def get_session_id_from_token(
    token: str,
) -> UUID:
    """
    Extract the authentication session UUID from the JWT `sid`
    claim.
    """

    payload = decode_access_token(token)

    try:
        return UUID(str(payload["sid"]))
    except (ValueError, TypeError, KeyError):
        raise JWTError("Invalid session ID claim.")


# ============================================================
# VALIDATE ACCESS TOKEN
# ============================================================

def validate_access_token(
    token: str,
) -> bool:
    """
    Return True only when the JWT is valid.
    """

    try:
        decode_access_token(token)
        return True
    except JWTError:
        return False


__all__ = [
    "JWTError",
    "create_access_token",
    "decode_access_token",
    "get_user_id_from_token",
    "get_session_id_from_token",
    "validate_access_token",
]