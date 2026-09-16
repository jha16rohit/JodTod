"""Focused Google OIDC validation tests without network or database access."""

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from backend.config import settings
from backend.services.auth_oauth_service import (
    InvalidOAuthTokenError,
    verify_google_id_token,
)


@pytest.fixture
def rsa_keys():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


def _token(private_key, **overrides):
    now = datetime.now(timezone.utc)
    claims = {
        "iss": "https://accounts.google.com",
        "aud": settings.google_client_id,
        "sub": "google-subject-1",
        "email": "google-user@example.com",
        "email_verified": True,
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "name": "Google User",
    }
    claims.update(overrides)
    return jwt.encode(claims, private_key, algorithm="RS256")


def test_valid_google_identity_is_verified(rsa_keys):
    private_key, public_key = rsa_keys
    claims = verify_google_id_token(
        _token(private_key),
        key_fetcher=lambda _: public_key,
    )
    assert claims["sub"] == "google-subject-1"
    assert claims["email_verified"] is True


@pytest.mark.parametrize(
    "overrides",
    [
        {"aud": "wrong-client-id"},
        {"iss": "https://evil.example.com"},
        {"exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        {"email_verified": False},
    ],
)
def test_invalid_google_identity_is_rejected(rsa_keys, overrides):
    private_key, public_key = rsa_keys
    with pytest.raises(InvalidOAuthTokenError):
        verify_google_id_token(
            _token(private_key, **overrides),
            key_fetcher=lambda _: public_key,
        )
