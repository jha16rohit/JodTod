# backend/services/user_service.py

import re
from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import hash_password
from backend.models.user import AccountStatus, User
from backend.schemas.user import UserCreate


class DuplicateAccountError(Exception):
    """Raised when an email or phone is already registered."""


class DuplicateProfileFieldError(DuplicateAccountError):
    """
    Raised when a profile update collides with another user's unique
    field (username or phone). Mapped to HTTP 409 by the users router.
    """


# Public handles: 3-32 chars, letters/digits plus . _ - (stored trimmed,
# uniqueness enforced case-insensitively to avoid "Rohit" vs "rohit").
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]{3,32}$")

# International format preserved as typed: digits plus + ( ) - . space.
PHONE_ALLOWED_PATTERN = re.compile(r"^[+0-9()\-.\s]+$")


class InactiveAccountError(Exception):
    """Raised when an account cannot authenticate."""


class UserService:
    """
    Service responsible for user-related authentication operations.

    Database transactions are intentionally controlled by the caller.
    This allows auth routes/services to combine user + session operations
    inside one transaction when required.
    """

    # ============================================================
    # FIND USER
    # ============================================================

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        user_id: UUID,
    ) -> Optional[User]:
        """
        Retrieve a user by primary key.
        """

        return await db.scalar(
            select(User).where(
                User.id == user_id
            )
        )

    @staticmethod
    async def get_by_email(
        db: AsyncSession,
        email: str,
    ) -> Optional[User]:
        """
        Retrieve a user by email address.
        """

        if not email:
            return None

        normalized_email = email.strip().lower()

        return await db.scalar(
            select(User).where(
                User.email == normalized_email
            )
        )

    @staticmethod
    async def get_by_username(
        db: AsyncSession,
        username: str,
        *,
        exclude_user_id: Optional[UUID] = None,
    ) -> Optional[User]:
        """
        Retrieve a user by public username (case-insensitive).

        exclude_user_id skips the caller's own row so an unchanged
        username never collides with itself.
        """

        if not username:
            return None

        stmt = select(User).where(
            func.lower(User.username) == username.strip().lower()
        )
        if exclude_user_id is not None:
            stmt = stmt.where(User.id != exclude_user_id)
        return await db.scalar(stmt)

    @staticmethod
    async def get_by_phone(
        db: AsyncSession,
        phone: str,
    ) -> Optional[User]:
        """
        Retrieve a user by phone number.
        """

        if not phone:
            return None

        normalized_phone = phone.strip()

        return await db.scalar(
            select(User).where(
                User.phone == normalized_phone
            )
        )

    @staticmethod
    async def get_by_phone_excluding(
        db: AsyncSession,
        phone: str,
        exclude_user_id: UUID,
    ) -> Optional[User]:
        """Phone lookup that ignores the caller's own row."""

        if not phone:
            return None

        return await db.scalar(
            select(User).where(
                User.phone == phone.strip(),
                User.id != exclude_user_id,
            )
        )

    @staticmethod
    async def get_by_identifier(
        db: AsyncSession,
        identifier: str,
    ) -> Optional[User]:
        """
        Retrieve a user using either email or phone number.
        """

        if not identifier:
            return None

        value = identifier.strip()

        # Email-like identifier
        if "@" in value:
            return await UserService.get_by_email(
                db,
                value,
            )

        # Otherwise treat it as phone
        return await UserService.get_by_phone(
            db,
            value,
        )

    @staticmethod
    async def get_by_provider_subject(
        db: AsyncSession,
        provider: str,
        subject: str,
    ) -> Optional[User]:
        """
        Retrieve a user by linked OAuth provider subject.

        provider is "google" or "apple"; the subject is the
        provider-stable user identifier (never an email or name).
        """

        if not subject:
            return None

        column = (
            User.google_subject
            if provider == "google"
            else User.apple_subject
        )

        return await db.scalar(
            select(User).where(
                column == subject.strip()
            )
        )

    # ============================================================
    # DUPLICATE DETECTION
    # ============================================================

    @staticmethod
    async def check_duplicate(
        db: AsyncSession,
        email: Optional[str] = None,
        phone: Optional[str] = None,
    ) -> Optional[User]:
        """
        Return an existing user if the email or phone is already
        registered.
        """

        conditions = []

        if email:
            conditions.append(
                User.email == email.strip().lower()
            )

        if phone:
            conditions.append(
                User.phone == phone.strip()
            )

        if not conditions:
            return None

        return await db.scalar(
            select(User).where(
                or_(*conditions)
            )
        )

    # ============================================================
    # CREATE USER
    # ============================================================

    @staticmethod
    async def create_user(
        db: AsyncSession,
        user_data: UserCreate,
    ) -> User:
        """
        Create a new user.

        Password is hashed before being written to the database.
        """

        email = (
            user_data.email.lower()
            if user_data.email
            else None
        )

        phone = (
            user_data.phone.strip()
            if user_data.phone
            else None
        )

        existing_user = await UserService.check_duplicate(
            db=db,
            email=email,
            phone=phone,
        )

        if existing_user:
            raise DuplicateAccountError(
                "A user with this email or phone already exists."
            )

        if not email and not phone:
            raise ValueError(
                "Either email or phone is required."
            )

        if not user_data.password:
            raise ValueError(
                "Password is required for password-based signup."
            )

        new_user = User(
            name=user_data.name,
            email=email,
            phone=phone,
            password_hash=hash_password(
                user_data.password
            ),
            email_verified=False,
            phone_verified=False,
            account_status=AccountStatus.ACTIVE,
        )

        db.add(new_user)
        await db.flush()

        return new_user

    # ============================================================
    # ACCOUNT STATUS
    # ============================================================

    @staticmethod
    def is_active(
        user: User,
    ) -> bool:
        """
        Determine whether an account can authenticate.
        """

        return user.account_status == AccountStatus.ACTIVE

    @staticmethod
    def ensure_active(
        user: User,
    ) -> None:
        """
        Raise an error if the account cannot authenticate.
        """

        if not UserService.is_active(user):
            raise InactiveAccountError(
                "User account is not active."
            )

    # ============================================================
    # PROFILE UPDATE
    # ============================================================

    @staticmethod
    def validate_username_format(username: str) -> str:
        """
        Clean and validate a public username.

        Raises ValueError for blank/overlong/malformed handles.
        Uniqueness is checked separately (needs the database).
        """
        cleaned = (username or "").strip()
        if not cleaned:
            raise ValueError(
                "Username cannot be empty."
            )
        if not USERNAME_PATTERN.match(cleaned):
            raise ValueError(
                "Username must be 3-32 characters using letters, "
                "numbers, dot, underscore, or hyphen."
            )
        return cleaned

    @staticmethod
    def validate_phone_format(phone: str) -> str:
        """
        Clean and validate a phone number.

        International format is preserved as typed (leading '+'
        kept). Raises ValueError for blank/malformed numbers.
        Uniqueness is checked separately (needs the database).
        """
        cleaned = (phone or "").strip()
        if not cleaned:
            raise ValueError(
                "Phone number cannot be empty."
            )
        if len(cleaned) > 32:
            raise ValueError(
                "Phone number is too long."
            )
        if not PHONE_ALLOWED_PATTERN.match(cleaned):
            raise ValueError(
                "Phone number contains invalid characters."
            )
        digits = re.sub(r"\D", "", cleaned)
        if not 7 <= len(digits) <= 15:
            raise ValueError(
                "Phone number must contain 7-15 digits."
            )
        return cleaned

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        user: User,
        name: Optional[str] = None,
        username: Optional[str] = None,
        phone: Optional[str] = None,
    ) -> User:
        """
        Update the authenticated user's editable profile fields.

        Only Full Name, Username, and Phone Number are writable here —
        Email is never touched by this method (read-only on the
        Personal Information page). Each supplied field is validated;
        username/phone are checked for uniqueness against OTHER users
        (the caller's own row is excluded). Raises ValueError for
        invalid values and DuplicateProfileFieldError for collisions.
        """

        if name is not None:
            cleaned_name = name.strip()

            if not cleaned_name:
                raise ValueError(
                    "Name cannot be empty."
                )

            if len(cleaned_name) > 100:
                raise ValueError(
                    "Name is too long."
                )

            user.name = cleaned_name

        if username is not None:
            cleaned_username = UserService.validate_username_format(
                username
            )
            taken = await UserService.get_by_username(
                db,
                cleaned_username,
                exclude_user_id=user.id,
            )
            if taken is not None:
                raise DuplicateProfileFieldError(
                    "This username is already taken."
                )
            user.username = cleaned_username

        if phone is not None:
            cleaned_phone = UserService.validate_phone_format(phone)
            taken = await UserService.get_by_phone_excluding(
                db,
                cleaned_phone,
                user.id,
            )
            if taken is not None:
                raise DuplicateProfileFieldError(
                    "This phone number is already registered."
                )
            user.phone = cleaned_phone

        await db.flush()

        return user