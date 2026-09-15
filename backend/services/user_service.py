# backend/services/user_service.py

from typing import Optional
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import hash_password
from backend.models.user import AccountStatus, User
from backend.schemas.user import UserCreate


class DuplicateAccountError(Exception):
    """Raised when an email or phone is already registered."""


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
    async def update_profile(
        db: AsyncSession,
        user: User,
        name: Optional[str] = None,
    ) -> User:
        """
        Update basic user profile information.
        """

        if name is not None:
            cleaned_name = name.strip()

            if not cleaned_name:
                raise ValueError(
                    "Name cannot be empty."
                )

            user.name = cleaned_name

        await db.flush()

        return user