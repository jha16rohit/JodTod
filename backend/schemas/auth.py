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

    session_id is optional but recommended: supplying it enables
    full rotation-reuse detection on the backend.
    """

    refresh_token: str = Field(
        min_length=1,
        max_length=4096,
    )

    session_id: Optional[UUID] = None


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

    Device fields are used only when verification opens a session
    (purpose PHONE_LOGIN); they are ignored otherwise.
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

    device_id: Optional[str] = Field(
        default=None,
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


class OTPResponse(BaseModel):
    """
    Response from an OTP operation.
    """

    message: str

    expires_at: Optional[datetime] = None

    retry_after_seconds: Optional[int] = None

    verified: bool = False

    # Dispatch metadata is deliberately limited to safe, operational status.
    # Provider acceptance is not proof of final delivery.
    provider: Optional[str] = None
    provider_accepted: Optional[bool] = None
    delivery_status: Optional[str] = None

    dev_code: Optional[str] = Field(
        default=None,
        description=(
            "Development-only echo of the generated code. Populated "
            "exclusively when the environment is non-production AND a "
            "mock delivery provider handled the channel. Always null "
            "in production."
        ),
    )


# EMAIL VERIFICATION (6-digit OTP)
class SendEmailVerificationRequest(BaseModel):
    """
    Request a 6-digit verification code for an email address.
    """

    email: EmailStr


class VerifyEmailCodeRequest(BaseModel):
    """
    Verify an email address with the 6-digit code.

    NOTE: this replaces the legacy token-only VerifyEmailRequest
    contract. A bare token cannot safely resolve an account (the
    same short code could exist for several destinations), so the
    email is required alongside the code. Path
    POST /api/auth/verify-email is preserved.
    """

    email: EmailStr

    code: str = Field(
        min_length=4,
        max_length=10,
    )


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


# PASSWORD RECOVERY (6-digit OTP)
class ForgotPasswordRequest(BaseModel):
    """
    Request a password-reset code.

    identifier accepts an email address or a phone number; the
    response is identical whether or not an account exists.
    """

    identifier: str = Field(
        min_length=3,
        max_length=255,
    )


class ResetPasswordRequest(BaseModel):
    """
    Set a new password using a verified reset code.
    """

    identifier: str = Field(
        min_length=3,
        max_length=255,
    )

    code: str = Field(
        min_length=4,
        max_length=10,
    )

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )


# OAUTH (Google / Apple)
class OAuthRequest(BaseModel):
    """
    Authenticate with a provider-issued ID token.

    The backend validates the token (issuer, audience, expiry,
    subject, signature) and never trusts client-supplied profile
    fields. Device fields seed the resulting JodTod session.
    """

    id_token: str = Field(
        min_length=1,
        max_length=8192,
    )

    device_id: Optional[str] = Field(
        default=None,
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


# DEVICE / SESSION MANAGEMENT
class SessionInfo(BaseModel):
    """
    Safe per-session summary for device-management screens.
    """

    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    device_id: str
    device_name: Optional[str] = None
    platform: Optional[str] = None
    app_version: Optional[str] = None
    expires_at: datetime
    last_used_at: Optional[datetime] = None
    is_active: bool
    revoked_at: Optional[datetime] = None
    created_at: datetime
    current: bool = False


class SessionListResponse(BaseModel):
    """All sessions belonging to the authenticated user."""

    sessions: list[SessionInfo]


# CURRENT USER
class CurrentUserResponse(BaseModel):
    """
    Response for:

        GET /users/me
    """

    user: AuthenticatedUser
