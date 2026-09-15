"""
Tests for request/response schemas (validation + no-leakage).
"""

import pytest
from pydantic import ValidationError

from backend.models.otp import OTPPurpose
from backend.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshTokenRequest,
    SendOTPRequest,
    SignupRequest,
    TokenResponse,
    VerifyOTPRequest,
)
from backend.schemas.user import AuthenticatedUser, UserCreate, UserPublic


def test_signup_requires_identifier():
    with pytest.raises(ValidationError):
        SignupRequest(password="Password123")


def test_signup_accepts_email_or_phone():
    email_only = SignupRequest(email="a@b.com")
    phone_only = SignupRequest(phone="+15551234567")
    assert email_only.email == "a@b.com"
    assert phone_only.phone == "+15551234567"


def test_signup_password_constraints():
    with pytest.raises(ValidationError):
        SignupRequest(email="a@b.com", password="short")
    with pytest.raises(ValidationError):
        SignupRequest(email="a@b.com", password="x" * 129)


def test_login_request_validation():
    LoginRequest(identifier="user@example.com", password="Password123")
    with pytest.raises(ValidationError):
        LoginRequest(identifier="a", password="Password123")
    with pytest.raises(ValidationError):
        LoginRequest(identifier="user@example.com", password="short")


def test_refresh_token_request_validation():
    RefreshTokenRequest(refresh_token="abc")
    with pytest.raises(ValidationError):
        RefreshTokenRequest(refresh_token="")


def test_send_otp_purpose_enum():
    req = SendOTPRequest(
        destination="+15551234567",
        purpose="phone_login",
    )
    assert req.purpose is OTPPurpose.PHONE_LOGIN

    with pytest.raises(ValidationError):
        SendOTPRequest(
            destination="+15551234567",
            purpose="not-a-purpose",
        )


def test_verify_otp_purpose_enum():
    req = VerifyOTPRequest(
        destination="user@example.com",
        otp="123456",
        purpose=OTPPurpose.EMAIL_VERIFICATION,
    )
    assert req.purpose == OTPPurpose.EMAIL_VERIFICATION


def test_user_public_never_exposes_secrets():
    allowed = set(UserPublic.model_fields.keys())
    assert "password" not in allowed
    assert "password_hash" not in allowed
    assert "refresh_token" not in allowed
    assert "otp" not in allowed


def test_user_create_contains_password_but_public_does_not():
    assert "password" in UserCreate.model_fields
    assert "password" not in UserPublic.model_fields


def test_token_response_shape():
    resp = TokenResponse(
        access_token="a.b.c",
        refresh_token="rt",
        expires_in=900,
        refresh_expires_in=2592000,
        session_id=None,
    )
    assert resp.token_type == "bearer"


def test_auth_response_from_attributes():
    user = AuthenticatedUser(
        id="11111111-1111-1111-1111-111111111111",
        email="a@b.com",
        account_status="active",
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
    )
    tokens = TokenResponse(
        access_token="a",
        refresh_token="r",
        expires_in=900,
    )
    auth = AuthResponse(user=user, tokens=tokens)
    assert auth.user.email == "a@b.com"