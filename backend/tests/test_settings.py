"""
Tests for backend.config Settings behavior.
"""

import pytest
from pydantic import ValidationError, SecretStr

from backend.config import Settings, get_settings


def test_settings_singleton_consistent():
    assert get_settings() is get_settings()


def test_settings_sensitive_fields_are_secrets():
    s = get_settings()
    assert isinstance(s.jwt_secret_key, SecretStr)
    assert isinstance(s.database_url, SecretStr)
    # SecretStr never renders its value via str().
    assert "test-secret" not in str(s.jwt_secret_key)


def test_settings_derived_seconds():
    s = get_settings()
    assert s.access_token_expire_seconds == s.access_token_expire_minutes * 60
    assert s.refresh_token_expire_seconds == s.refresh_token_expire_days * 24 * 3600
    assert s.email_verification_expire_seconds == s.email_verification_expire_hours * 3600
    assert s.password_reset_expire_seconds == s.password_reset_expire_minutes * 60


def test_settings_production_guardrails_raise():
    with pytest.raises(ValidationError):
        Settings(
            environment="production",
            debug=True,
            jwt_secret_key=B"x" * 64,
            database_url="postgresql+asyncpg://x",
        )

    with pytest.raises(ValidationError):
        Settings(
            environment="production",
            jwt_secret_key=B"x" * 64,
            database_url="postgresql+asyncpg://x",
            otp_provider="mock",
        )


def test_settings_rejects_wildcard_cors_in_production():
    with pytest.raises(ValidationError):
        Settings(
            environment="production",
            jwt_secret_key=B"x" * 64,
            database_url="postgresql+asyncpg://x",
            cors_allowed_origins=["*"],
        )


def test_settings_accepts_testing_with_mock_providers():
    s = Settings(
        environment="testing",
        jwt_secret_key=B"x" * 64,
        database_url="postgresql+asyncpg://x",
        otp_provider="mock",
        email_provider="mock",
    )
    assert s.environment == "testing"


def test_settings_jwt_algorithm_validation():
    with pytest.raises(ValidationError):
        Settings(
            environment="testing",
            jwt_secret_key=B"x" * 64,
            database_url="postgresql+asyncpg://x",
            jwt_algorithm="RS256",
        )


def test_generate_secret():
    a = Settings.generate_secret(64)
    b = Settings.generate_secret(64)
    assert len(a) >= 64
    assert a != b