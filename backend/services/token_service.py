# backend/services/token_service.py

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from backend.config import settings
from backend.core.jwt import create_access_token
from backend.core.security import (
    generate_secure_token,
    hash_token,
    verify_token,
)


class TokenService:
    """
    Authentication token lifecycle service.

    IMPORTANT:
    Raw refresh tokens are returned only to the client.

    The database should contain only:
        SHA-256(refresh_token)

    Never store the raw refresh token.
    """

    # ============================================================
    # TIME
    # ============================================================

    @staticmethod
    def utc_now() -> datetime:
        return datetime.now(timezone.utc)

    # ============================================================
    # REFRESH TOKEN
    # ============================================================

    @staticmethod
    def generate_refresh_token() -> str:
        """
        Generate a cryptographically secure refresh token.
        """

        return generate_secure_token(48)

    @staticmethod
    def hash_refresh_token(
        refresh_token: str,
    ) -> str:
        """
        Hash a refresh token before database storage.
        """

        return hash_token(refresh_token)

    @staticmethod
    def verify_refresh_token(
        refresh_token: str,
        stored_hash: str,
    ) -> bool:
        """
        Verify a raw refresh token against the stored hash.
        """

        return verify_token(
            refresh_token,
            stored_hash,
        )

    # ============================================================
    # EXPIRY
    # ============================================================

    @staticmethod
    def get_refresh_expiry() -> datetime:
        """
        Calculate refresh-token expiration time.
        """

        return (
            TokenService.utc_now()
            + timedelta(
                days=settings.refresh_token_expire_days
            )
        )

    @staticmethod
    def get_access_expiry_seconds() -> int:
        """
        Return access-token lifetime in seconds.
        """

        return (
            settings.access_token_expire_minutes
            * 60
        )

    @staticmethod
    def get_refresh_expiry_seconds() -> int:
        """
        Return refresh-token lifetime in seconds.
        """

        return (
            settings.refresh_token_expire_days
            * 24
            * 60
            * 60
        )

    # ============================================================
    # ACCESS TOKEN
    # ============================================================

    @staticmethod
    def create_access_token(
        user_id: UUID,
        session_id: UUID,
    ) -> str:
        """
        Create a short-lived access JWT bound to a session.
        """

        return create_access_token(
            user_id=user_id,
            session_id=session_id,
        )

    # ============================================================
    # TOKEN PAIR
    # ============================================================

    @staticmethod
    def create_token_pair(
        user_id: UUID,
        session_id: UUID,
    ) -> dict:
        """
        Create an access-token + refresh-token pair.

        Returns:
            {
                access_token,
                refresh_token,
                refresh_token_hash,
                expires_in,
                refresh_expires_in,
                refresh_expires_at
            }
        """

        refresh_token = (
            TokenService.generate_refresh_token()
        )

        refresh_token_hash = (
            TokenService.hash_refresh_token(
                refresh_token
            )
        )

        return {
            "access_token": (
                TokenService.create_access_token(
                    user_id=user_id,
                    session_id=session_id,
                )
            ),
            "refresh_token": refresh_token,
            "refresh_token_hash": refresh_token_hash,
            "expires_in": (
                TokenService.get_access_expiry_seconds()
            ),
            "refresh_expires_in": (
                TokenService.get_refresh_expiry_seconds()
            ),
            "refresh_expires_at": (
                TokenService.get_refresh_expiry()
            ),
        }

    # ============================================================
    # TOKEN VALIDITY
    # ============================================================

    @staticmethod
    def is_refresh_token_expired(
        expires_at: datetime,
    ) -> bool:
        """
        Check whether a refresh token has expired.
        """

        now = TokenService.utc_now()

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(
                tzinfo=timezone.utc
            )

        return expires_at <= now