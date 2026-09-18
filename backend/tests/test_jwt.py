"""
Tests for the JWT foundation layer (backend.core.jwt).

Verified against installed PyJWT 2.14.0 (project dependency strategy).
"""

from datetime import timedelta
from uuid import uuid4

import pytest

from backend.config import settings
from backend.core.jwt import (
    JWTError,
    create_access_token,
    decode_access_token,
    get_session_id_from_token,
    get_user_id_from_token,
    validate_access_token,
)
from backend.core.security import hash_token


def _token(user_id=None, session_id=None, **overrides):
    return create_access_token(
        user_id=user_id or str(uuid4()),
        session_id=session_id or str(uuid4()),
        **overrides,
    )


def test_create_and_decode_roundtrip():
    user_id = uuid4()
    session_id = uuid4()
    token = create_access_token(user_id=user_id, session_id=session_id)

    claims = decode_access_token(token)

    assert claims["sub"] == str(user_id)
    assert claims["sid"] == str(session_id)
    assert claims["type"] == "access"
    assert claims["exp"] > claims["iat"]
    assert claims["jti"]


def test_user_and_session_id_extraction():
    user_id = uuid4()
    session_id = uuid4()
    token = create_access_token(user_id=user_id, session_id=session_id)

    assert get_user_id_from_token(token) == user_id
    assert get_session_id_from_token(token) == session_id


def test_extractors_reject_non_uuid_claims():
    token = create_access_token(
        user_id="not-a-uuid",
        session_id=str(uuid4()),
    )
    with pytest.raises(JWTError):
        get_user_id_from_token(token)


def test_validate_access_token():
    assert validate_access_token(_token()) is True
    assert validate_access_token("garbage") is False
    assert validate_access_token("") is False


def test_tampered_signature_rejected():
    token = _token()
    tampered = token[:-2] + ("XY" if token[-2:] != "XY" else "ZZ")
    with pytest.raises(JWTError):
        decode_access_token(tampered)


def test_wrong_secret_rejected():
    """Token signed with a different secret is rejected."""
    import jwt as pyjwt

    from backend.core.jwt import create_access_token, decode_access_token

    user_id = str(uuid4())
    session_id = str(uuid4())

    now = int(__import__("time").time())
    payload = {
        "sub": user_id,
        "sid": session_id,
        "type": "access",
        "iat": now,
        "exp": now + 300,
        "jti": str(uuid4()),
    }
    # Sign with a wrong secret (different from what decode_access_token uses).
    token = pyjwt.encode(payload, "wrong-secret-must-be-32-chars-long-!!!", algorithm="HS256")

    with pytest.raises(JWTError):
        decode_access_token(token)


def test_expired_token_rejected():
    token = create_access_token(
        user_id=str(uuid4()),
        session_id=str(uuid4()),
        expires_delta=timedelta(seconds=-10),
    )
    with pytest.raises(JWTError):
        decode_access_token(token)


def test_wrong_token_type_rejected():
    from backend.core.jwt import create_access_token as create

    user_id = uuid4()
    session_id = uuid4()

    import jwt as pyjwt

    now = int(__import__("time").time())
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "type": "refresh",
        "iat": now,
        "exp": now + 300,
        "jti": str(uuid4()),
    }
    token = pyjwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )

    assert create is not None
    with pytest.raises(JWTError):
        decode_access_token(token)


def test_missing_required_claims_rejected():
    import jwt as pyjwt

    now = int(__import__("time").time())
    payload = {
        "type": "access",
        "iat": now,
        "exp": now + 300,
    }
    token = pyjwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(JWTError):
        decode_access_token(token)


def test_empty_token_rejected():
    with pytest.raises(JWTError):
        decode_access_token("")


def test_extra_claims_cannot_override_reserved():
    token = create_access_token(
        user_id=str(uuid4()),
        session_id=str(uuid4()),
        extra_claims={"type": "refresh", "custom": "allowed"},
    )
    claims = decode_access_token(token)
    assert claims["type"] == "access"
    assert claims["custom"] == "allowed"


def test_hash_token_is_not_raw():
    raw = "client-refresh-token-abc"
    assert hash_token(raw) != raw
    assert len(hash_token(raw)) == 64