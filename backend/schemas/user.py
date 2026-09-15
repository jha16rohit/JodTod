# backend/schemas/user.py

from datetime import datetime
from typing import Optional
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

    pass