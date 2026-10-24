"""Focused Google OIDC validation tests without network or database access."""

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from backend.config import settings
from backend.services.auth_oauth_service import (
    InvalidOAuthTokenError,
    OAuthNotConfiguredError,
    google_audiences,
    verify_google_id_token,
)


@pytest.fixture
def rsa_keys():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


def _audience() -> str:
    """A client ID this deployment actually accepts.

    The app may be configured with a Web client, an Android client, or
    both, so tests must not assume a specific one is present in .env.
    """
    configured = sorted(google_audiences())
    if configured:
        return configured[0]
    return "test-google-client-id.apps.googleusercontent.com"


def _token(private_key, **overrides):
    now = datetime.now(timezone.utc)
    claims = {
        "iss": "https://accounts.google.com",
        "aud": _audience(),
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


def test_android_client_id_is_accepted_as_audience(rsa_keys, monkeypatch):
    """The app resolves the Google client per platform.

    An ID token minted for the Android client carries that client as its
    `aud`, so the backend must verify it instead of rejecting it as an
    unknown audience.
    """
    private_key, public_key = rsa_keys
    android_client_id = "491126960792-android-client-id.apps.googleusercontent.com"
    monkeypatch.setattr(settings, "google_client_id", "web-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "google_android_client_id", android_client_id)

    assert google_audiences() == {
        "web-client-id.apps.googleusercontent.com",
        android_client_id,
    }

    claims = verify_google_id_token(
        _token(private_key, aud=android_client_id),
        key_fetcher=lambda _: public_key,
    )
    assert claims["sub"] == "google-subject-1"


def test_unconfigured_when_no_google_client_id(rsa_keys, monkeypatch):
    private_key, public_key = rsa_keys
    monkeypatch.setattr(settings, "google_client_id", None)
    monkeypatch.setattr(settings, "google_android_client_id", None)

    assert google_audiences() == set()
    with pytest.raises(OAuthNotConfiguredError):
        verify_google_id_token(
            _token(private_key),
            key_fetcher=lambda _: public_key,
        )


def test_blank_client_ids_are_ignored(rsa_keys, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "  ")
    monkeypatch.setattr(settings, "google_android_client_id", "")
    assert google_audiences() == set()
