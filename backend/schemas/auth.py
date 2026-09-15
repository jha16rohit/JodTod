# backend/schemas/auth.py

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from backend.models.otp import OTPPurpose
from backend.schemas.user import AuthenticatedUser


# GENERIC RESPONSES
class MessageResponse(BaseModel):
    """
    Generic success/message response.
    """

    message: str


class ErrorResponse(BaseModel):
    """
    Standard application error response.
    """

    detail: str

    code: Optional[str] = None


# SIGNUP
class SignupRequest(BaseModel):
    """
    Account registration request.

    Requires at least one identifier (email or phone) and, for a
    password-based flow, a password.
    """

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    email: Optional[EmailStr] = None

    phone: Optional[str] = Field(
        default=None,
        min_length=7,
        max_length=20,
    )

    password: Optional[str] = Field(
        default=None,
        min_length=8,
        max_length=128,
    )

    device_id: str = Field(
        min_length=1,
        max_length=255,
    )

    device_name: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    platform: Optional[str] = Field(
        default=None,
        max_length=32,
    )

    app_version: Optional[str] = Field(
        default=None,
        max_length=64,
    )
    
    @model_validator(mode="after")
    def require_at_least_one_identifier(self) -> "SignupRequest":
        if not self.email and not self.phone:
            raise ValueError(
                "Either email or phone is required."
            )
        return self


# LOGIN
class LoginRequest(BaseModel):
    """
    Password-based login request.

    identifier can contain:
    - email
    - phone number

    The service layer determines which one was supplied.
    """

    identifier: str = Field(
        min_length=3,
        max_length=255,
    )

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    device_id: Optional[str] = Field(
        default=None,
        max_length=255,
    )


# REFRESH TOKEN
class RefreshTokenRequest(BaseModel):
    """
    Request for rotating the current refresh token and issuing
    a new access token.
    """

    refresh_token: str = Field(
        min_length=1,
        max_length=4096,
    )


# LOGOUT
class LogoutRequest(BaseModel):
    """
    Logout request.

    If session_id is omitted, the currently authenticated session
    can be revoked by the authentication dependency/service.
    """

    session_id: Optional[UUID] = None


# SEND OTP
class SendOTPRequest(BaseModel):
    """
    Request to send an OTP.

    destination can be:
    - phone number
    - email address

    purpose identifies why the OTP is being generated.
    """

    destination: str = Field(
        min_length=3,
        max_length=255,
    )

    purpose: OTPPurpose


# VERIFY OTP
class VerifyOTPRequest(BaseModel):
    """
    Verify an OTP previously issued for a destination/purpose.
    """

    destination: str = Field(
        min_length=3,
        max_length=255,
    )

    otp: str = Field(
        min_length=4,
        max_length=10,
    )

    purpose: OTPPurpose


class OTPResponse(BaseModel):
    """
    Response from an OTP operation.
    """

    message: str

    expires_at: Optional[datetime] = None

    retry_after_seconds: Optional[int] = None


# EMAIL VERIFICATION
class VerifyEmailRequest(BaseModel):
    """
    Verify an email using a verification token.
    """

    token: str = Field(
        min_length=1,
        max_length=4096,
    )


class EmailVerificationResponse(BaseModel):
    """
    Result of email verification.
    """

    message: str

    verified: bool


# ACCESS + REFRESH TOKENS
class TokenResponse(BaseModel):
    """
    Authentication tokens returned to the mobile application.

    The raw refresh token is returned to the client only.
    The backend should store only a hash of it.
    """

    access_token: str

    refresh_token: str

    token_type: str = "bearer"

    expires_in: int = Field(
        ge=0
    )

    refresh_expires_in: Optional[int] = Field(
        default=None,
        ge=0,
    )

    session_id: Optional[UUID] = None


# COMPLETE AUTH RESPONSE
class AuthResponse(BaseModel):
    """
    Complete successful authentication response.
    """

    model_config = ConfigDict(
        from_attributes=True
    )

    user: AuthenticatedUser

    tokens: TokenResponse


# CURRENT USER
class CurrentUserResponse(BaseModel):
    """
    Response for:

        GET /users/me
    """

    user: AuthenticatedUser