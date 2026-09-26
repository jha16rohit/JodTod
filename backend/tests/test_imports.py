# backend/tests/test_imports.py

"""
Import-smoke tests for every foundation file.

Defines the cross-layer contract: every module must import cleanly and
expose the documented public symbols.
"""


def test_config_imports():
    from backend.config import Settings, get_settings, settings

    assert settings.environment == "testing"
    assert Settings is not None
    assert callable(get_settings)


def test_database_imports():
    from backend.database import (
        AsyncSessionLocal,
        DATABASE_URL,
        check_database_connection,
        dispose_database,
        engine,
        get_db,
        initialize_database,
        ping_database,
        transaction,
    )

    assert DATABASE_URL.startswith("postgresql+asyncpg://")


def test_models_imports():
    from backend.models.base import Base, NAMING_CONVENTION
    from backend.models.email_verification import EmailVerification
    from backend.models.otp import OTP, OTPDestinationType, OTPPurpose
    from backend.models.password_reset import PasswordReset
    from backend.models.session import Session
    from backend.models.user import AccountStatus, User

    import backend.models  # noqa: F401

    tables = set(Base.metadata.tables.keys())
    assert {
        "users",
        "sessions",
        "otp_records",
        "email_verifications",
        "password_resets",
    }.issubset(tables)
    assert "ix" in NAMING_CONVENTION


def test_schemas_imports():
    from backend.schemas.auth import (
        AuthResponse,
        CurrentUserResponse,
        EmailVerificationResponse,
        ErrorResponse,
        LoginRequest,
        LogoutRequest,
        MessageResponse,
        OTPResponse,
        RefreshTokenRequest,
        SendOTPRequest,
        SignupRequest,
        TokenResponse,
        VerifyEmailRequest,
        VerifyOTPRequest,
    )
    from backend.schemas.user import AuthenticatedUser, UserBase, UserCreate, UserPublic

    assert UserPublic.model_fields.get("password_hash") is None
    assert UserCreate.model_fields.get("password") is not None


def test_core_imports():
    from backend.core.jwt import (
        JWTError,
        create_access_token,
        decode_access_token,
        get_session_id_from_token,
        get_user_id_from_token,
        validate_access_token,
    )
    from backend.core.security import (
        generate_otp,
        generate_secure_token,
        generate_session_token,
        hash_password,
        hash_token,
        verify_password,
        verify_token,
    )

    assert callable(create_access_token)
    assert callable(hash_password)


def test_services_imports():
    from backend.services.session_service import RefreshTokenReuseError, SessionService
    from backend.services.token_service import TokenService
    from backend.services.user_service import DuplicateAccountError, UserService

    assert callable(SessionService.create_session)
    assert callable(TokenService.create_token_pair)
    assert callable(UserService.create_user)


def test_dependencies_imports():
    from backend.dependencies.auth import (
        authentication_error,
        bearer_scheme,
        get_bearer_token,
        get_current_session,
        get_current_user,
        get_current_user_and_session,
        require_active_user,
    )

    assert bearer_scheme is not None
    assert callable(authentication_error)


def test_middleware_imports():
    from backend.middleware.auth import AuthenticationMiddleware

    assert "/api/health" in AuthenticationMiddleware.DEFAULT_PUBLIC_PATHS