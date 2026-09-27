"""
JodTod provider linking for the authenticated user (Linked Accounts).

Reuses the existing subject-column architecture (users.google_subject
/ users.apple_subject, verified by auth_oauth_service) — no duplicate
provider table. Linking NEVER creates a user and NEVER replaces the
session; it attaches a verified provider identity to the CURRENT user.

Security:
- identity always comes from the Bearer session (route passes User);
- provider identity comes from server-verified OAuth claims (the
  route verifies the ID token; this service never trusts client-
  supplied emails/subjects);
- a subject is globally unique per provider (DB unique constraint):
  linking a subject owned by another user raises OAuthConflictError
  without touching either account;
- unlink refuses to remove the last remaining sign-in method so the
  user can never lock themselves out.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import transaction
from backend.models.user import User
from backend.services.auth_oauth_service import OAuthConflictError
from backend.services.user_service import UserService

Provider = Literal["google", "apple"]

_SUBJECT_FIELD = {
    "google": "google_subject",
    "apple": "apple_subject",
}

_EMAIL_FIELD = {
    "google": "google_email",
    "apple": "apple_email",
}

_LINKED_AT_FIELD = {
    "google": "google_linked_at",
    "apple": "apple_linked_at",
}


def _fields(provider: Provider) -> tuple[str, str, str]:
    if provider not in _SUBJECT_FIELD:
        raise ValueError(
            "Unsupported provider. Use google or apple."
        )
    return (
        _SUBJECT_FIELD[provider],
        _EMAIL_FIELD[provider],
        _LINKED_AT_FIELD[provider],
    )


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ProviderLinkService:
    """Link / unlink / status for the authenticated user's providers."""

    @staticmethod
    def linked_state(user: User) -> dict[str, Any]:
        """
        Safe provider metadata for the Linked Accounts screen.

        No tokens, secrets, or subjects — only connected flags plus
        display emails/phones from the user's own record.
        """
        return {
            "email": {
                "connected": user.email is not None,
                "email": user.email,
                "verified": bool(user.email_verified),
            },
            "phone": {
                "connected": user.phone is not None,
                "phone": user.phone,
                "verified": bool(user.phone_verified),
            },
            "google": {
                "connected": user.google_subject is not None,
                "email": user.google_email,
                "connected_at": user.google_linked_at,
                "last_verified_at": user.google_linked_at,
            },
            "apple": {
                "connected": user.apple_subject is not None,
                "email": user.apple_email,
                "connected_at": user.apple_linked_at,
                "last_verified_at": user.apple_linked_at,
            },
            "facebook": {
                "connected": False,
                "available": False,
            },
        }

    @staticmethod
    async def link_provider(
        db: AsyncSession,
        user: User,
        provider: Provider,
        claims: dict[str, Any],
    ) -> User:
        """
        Attach a VERIFIED provider identity to the current user.

        claims must come from verify_google_id_token /
        verify_apple_identity_token (route responsibility). Raises
        ValueError for bad claims, OAuthConflictError when the subject
        belongs to another user or the account already links a
        different subject of the same provider.
        """
        subject_field, email_field, linked_at_field = _fields(provider)

        subject = str(claims.get("sub") or "").strip()
        if not subject:
            raise ValueError("Invalid provider identity.")

        email = str(claims.get("email") or "").strip() or None

        async with transaction(db):
            owner = await UserService.get_by_provider_subject(
                db, provider, subject
            )
            if owner is not None and owner.id != user.id:
                raise OAuthConflictError(
                    "This account is already linked to another "
                    "JodTod user."
                )

            existing = getattr(user, subject_field)
            if existing is not None and existing != subject:
                raise OAuthConflictError(
                    "This account is already linked to a different "
                    "identity. Use the original sign-in method."
                )

            setattr(user, subject_field, subject)
            if email is not None:
                setattr(user, email_field, email)
            # Idempotent relink refreshes verification time; the
            # globally-unique subject check above makes concurrent
            # duplicate links converge instead of duplicating.
            setattr(user, linked_at_field, utc_now())
            await db.flush()

        return user

    @staticmethod
    def remaining_methods(user: User) -> list[str]:
        """Sign-in methods present on the account (for the unlink guard)."""
        methods = []
        if user.password_hash:
            methods.append("password")
        if user.phone:
            methods.append("phone")
        if user.google_subject:
            methods.append("google")
        if user.apple_subject:
            methods.append("apple")
        return methods

    @staticmethod
    async def unlink_provider(
        db: AsyncSession,
        user: User,
        provider: Provider,
    ) -> User:
        """
        Detach a provider identity from the current user.

        Idempotent: unlinking a provider that is not linked succeeds
        with connected=false (no-op). Refuses with OAuthConflictError
        (409 LAST_AUTH_METHOD) when this is the last remaining sign-in
        method. Clears subject + display email + timestamps; the
        canonical JodTod email/phone are never touched.
        """
        subject_field, email_field, linked_at_field = _fields(provider)

        if getattr(user, subject_field) is None:
            return user

        remaining = [
            m for m in ProviderLinkService.remaining_methods(user)
            if m != provider
        ]
        if not remaining:
            raise OAuthConflictError(
                "Google cannot be disconnected because it is currently "
                "the only available sign-in method."
                if provider == "google" else
                "Apple cannot be disconnected because it is currently "
                "the only available sign-in method."
            )

        async with transaction(db):
            setattr(user, subject_field, None)
            setattr(user, email_field, None)
            setattr(user, linked_at_field, None)
            await db.flush()

        return user

    @staticmethod
    async def get_by_id_scoped(
        db: AsyncSession,
        user_id: UUID,
    ) -> User | None:
        """Fetch the user row for link/unlink writes (session identity)."""
        return await UserService.get_by_id(db, user_id)
