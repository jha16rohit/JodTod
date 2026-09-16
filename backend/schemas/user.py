# backend/schemas/user.py

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from backend.models.user import AccountStatus


# BASE USER SCHEMA
class UserBase(BaseModel):
    """
    Common fields shared by user-related schemas.
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


# USER CREATION
class UserCreate(UserBase):
    """
    Schema used when creating a user.

    IMPORTANT:
    - Password is received as plaintext only at the API boundary.
    - It must be hashed immediately by user_service/security.
    - Never return this object in an API response.
    """

    password: Optional[str] = Field(
        default=None,
        min_length=8,
        max_length=128,
    )


# PUBLIC USER
class UserPublic(UserBase):
    """
    Safe representation of a user.

    This schema intentionally does NOT contain:
    - password
    - password_hash
    - refresh_token
    - OTP
    - verification token
    - reset token
    """

    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID

    email_verified: bool = False
    phone_verified: bool = False
    account_status: AccountStatus = AccountStatus.PENDING
    created_at: datetime
    updated_at: datetime


# ============================================================
# AUTHENTICATED USER
# ============================================================

class AuthenticatedUser(UserPublic):
    """
    User representation returned after successful authentication
    or from an authenticated /me endpoint.

    Kept separate from UserPublic so additional authenticated-only
    fields can be added later without changing public responses.
    """

    # Linked provider flags (additive; derived server-side from the
    # stored provider subjects, never from client input).
    google_linked: bool = False
    apple_linked: bool = False
    # The backend, not the app, decides whether this account can enter the
    # protected application and which existing OTP flow must complete.
    verification_required: bool = False
    verification_method: Literal["email", "phone"] | None = None


def with_provider_flags(
    schema: AuthenticatedUser,
    *,
    google_subject: str | None,
    apple_subject: str | None,
) -> AuthenticatedUser:
    """Attach linked-provider flags to an authenticated user schema."""
    schema.google_linked = bool(google_subject)
    schema.apple_linked = bool(apple_subject)
    # Signup dispatches email verification when an email is supplied;
    # otherwise it dispatches phone verification. This preserves the selected
    # signup channel and never requires both channels for one account.
    if schema.email:
        schema.verification_method = "email"
        schema.verification_required = not schema.email_verified
    elif schema.phone:
        schema.verification_method = "phone"
        schema.verification_required = not schema.phone_verified
    else:
        schema.verification_method = None
        schema.verification_required = False
    return schema
