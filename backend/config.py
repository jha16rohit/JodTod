"""
JodTod Backend Configuration
Production-oriented environment configuration.
"""

from __future__ import annotations

import secrets
from functools import lru_cache
from typing import Literal
from pathlib import Path

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


Environment = Literal[
    "development",
    "testing",
    "staging",
    "production",
]

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.

    Real secrets must be supplied through .env or a production
    secret-management system.
    """

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        validate_default=True,
    )

    # ============================================================
    # APPLICATION
    # ============================================================
    app_name: str = "JodTod API"
    environment: Environment = "development"
    debug: bool = False
    api_version: str = "v1"
    host: str = "0.0.0.0"
    port: int = Field(
        default=5000,
        ge=1,
        le=65535,
    )

    # ============================================================
    # JWT / AUTHENTICATION
    # ============================================================
    jwt_secret_key: SecretStr = Field(
        min_length=32,
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(
        default=15,
        ge=1,
        le=1440,
    )
    refresh_token_expire_days: int = Field(
        default=30,
        ge=1,
        le=365,
    )

    # ============================================================
    # OTP
    # ============================================================
    otp_expire_seconds: int = Field(
        default=300,
        ge=30,
        le=1800,
    )
    otp_length: int = Field(
        default=6,
        ge=4,
        le=8,
    )
    otp_max_attempts: int = Field(
        default=5,
        ge=1,
        le=20,
    )
    otp_resend_cooldown_seconds: int = Field(
        default=60,
        ge=0,
        le=3600,
    )

    # ============================================================
    # EMAIL VERIFICATION
    # ============================================================
    email_verification_expire_hours: int = Field(
        default=24,
        ge=1,
        le=168,
    )

    # ============================================================
    # PASSWORD RESET
    # ============================================================
    password_reset_expire_minutes: int = Field(
        default=30,
        ge=5,
        le=120,
    )

    # ============================================================
    # PASSWORD SECURITY
    # ============================================================
    password_hash_algorithm: str = "argon2id"
    password_min_length: int = Field(
        default=8,
        ge=8,
        le=128,
    )
    password_max_length: int = Field(
        default=128,
        ge=8,
        le=256,
    )

    # ============================================================
    # DATABASE
    # ============================================================
    database_url: SecretStr
    database_pool_size: int = Field(
        default=10,
        ge=1,
        le=100,
    )
    database_max_overflow: int = Field(
        default=20,
        ge=0,
        le=200,
    )
    database_pool_timeout_seconds: int = Field(
        default=30,
        ge=1,
        le=300,
    )
    database_pool_recycle_seconds: int = Field(
        default=1800,
        ge=60,
        le=86400,
    )
    database_pool_pre_ping: bool = True
    database_echo: bool = False

    # ============================================================
    # CORS
    # ============================================================
    cors_allowed_origins: list[str] = Field(default_factory=list, )
    cors_allow_credentials: bool = True

    # ============================================================
    # GOOGLE OAUTH
    # ============================================================
    google_client_id: str | None = None
    google_client_secret: SecretStr | None = None
    google_redirect_uri: str | None = None

    # ============================================================
    # APPLE OAUTH
    # ============================================================
    apple_client_id: str | None = None
    apple_team_id: str | None = None
    apple_key_id: str | None = None
    apple_private_key: SecretStr | None = None
    apple_redirect_uri: str | None = None

    # ============================================================
    # OTP PROVIDER
    # ============================================================
    otp_provider: str = "mock"
    otp_provider_api_key: SecretStr | None = None
    otp_rate_limit_max_per_hour: int = Field(
        default=10,
        ge=1,
        le=1000,
    )

    # ============================================================
    # EMAIL PROVIDER
    # ============================================================

    email_provider: str = "mock"
    email_provider_api_key: SecretStr | None = None
    email_from_address: str = "no-reply@jodtod.local"
    email_from_name: str = "JodTod"

    # ============================================================
    # REQUEST / NETWORK
    # ============================================================
    max_request_body_mb: int = Field(
        default=10,
        ge=1,
        le=100,
    )

    trusted_proxy_count: int = Field(
        default=0,
        ge=0,
        le=20,
    )

    # ============================================================
    # LOGGING
    # ============================================================
    log_level: str = "INFO"
    log_json: bool = False

    # ============================================================
    # VALIDATORS
    # ============================================================
    @field_validator("jwt_algorithm")
    @classmethod
    def validate_jwt_algorithm(
        cls,
        value: str,
    ) -> str:

        allowed = {
            "HS256",
            "HS384",
            "HS512",
        }

        if value not in allowed:
            raise ValueError(
                f"jwt_algorithm must be one of {sorted(allowed)}"
            )

        return value

    @field_validator("log_level")
    @classmethod
    def validate_log_level(
        cls,
        value: str,
    ) -> str:

        value = value.upper()

        allowed = {
            "DEBUG",
            "INFO",
            "WARNING",
            "ERROR",
            "CRITICAL",
        }

        if value not in allowed:
            raise ValueError(
                f"log_level must be one of {sorted(allowed)}"
            )

        return value

    @field_validator("cors_allowed_origins")
    @classmethod
    def normalize_cors(
        cls,
        value: list[str],
    ) -> list[str]:

        return [
            origin.rstrip("/")
            for origin in value
            if origin.strip()
        ]

    @model_validator(mode="after")
    def validate_configuration(self) -> "Settings":

        if self.password_max_length < self.password_min_length:
            raise ValueError(
                "PASSWORD_MAX_LENGTH must be greater than "
                "or equal to PASSWORD_MIN_LENGTH."
            )

        if self.environment == "production":

            if self.debug:
                raise ValueError(
                    "DEBUG must be false in production."
                )

            if self.otp_provider == "mock":
                raise ValueError(
                    "OTP_PROVIDER=mock is not allowed in production."
                )

            if self.email_provider == "mock":
                raise ValueError(
                    "EMAIL_PROVIDER=mock is not allowed in production."
                )

            if "*" in self.cors_allowed_origins:
                raise ValueError(
                    "Wildcard CORS is not allowed in production."
                )

        return self

    # ============================================================
    # DERIVED VALUES
    # ============================================================

    @property
    def access_token_expire_seconds(self) -> int:
        return self.access_token_expire_minutes * 60

    @property
    def refresh_token_expire_seconds(self) -> int:
        return self.refresh_token_expire_days * 24 * 60 * 60

    @property
    def email_verification_expire_seconds(self) -> int:
        return self.email_verification_expire_hours * 60 * 60

    @property
    def password_reset_expire_seconds(self) -> int:
        return self.password_reset_expire_minutes * 60

    @property
    def dev_otp_disclosure_allowed(self) -> bool:
        """
        Whether a generated OTP may be returned to the caller for
        development convenience.

        Strictly environment-gated: only non-production environments
        using a mock provider qualify. Production responses and
        production logs must never contain an OTP.
        """
        if self.environment == "production":
            return False
        return self.otp_provider == "mock" or self.email_provider == "mock"

    # ============================================================
    # SECRET GENERATION
    # ============================================================

    @staticmethod
    def generate_secret(length: int = 64) -> str:
        return secrets.token_urlsafe(length)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Create one application-wide Settings instance.
    """

    return Settings()


# ================================================================
# APPLICATION SETTINGS SINGLETON
# ================================================================

settings = get_settings()


__all__ = [
    "Settings",
    "get_settings",
    "settings",
]