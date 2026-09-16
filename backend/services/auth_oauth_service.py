"""
JodTod Authentication - OAuth Service (Google + Apple).

Responsibilities:
    - Validate provider ID tokens on the backend (issuer, audience,
      expiry, subject, signature). Client-supplied profile fields
      are never trusted.
    - Resolve the JodTod account with safe linking rules:
        1. Known provider subject  -> log in that user.
        2. Unknown subject + verified email matching an existing
           user -> link the subject to that user, then log in.
        3. Unknown subject, no match -> create a new JodTod user.
        4. A subject is globally unique per provider; it can never
           point at two users, so silent merges are impossible.
        5. Linking a second, different subject of the same provider
           to one account is rejected (409), never overwritten.
    - Open a normal JodTod session (no parallel session system).

Important:
    - Secrets/configuration come only from backend.config settings.
    - Apple works without live credentials present: missing
      APPLE_CLIENT_ID fails closed with 503 at request time, and
      the code path is fully unit-tested with injected JWKS.
    - PyJWT's PyJWKClient uses only the standard library for HTTP,
      so no new HTTP dependency is required.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Callable, Literal

import jwt as pyjwt
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.core.jwt import create_access_token
from backend.database import transaction
from backend.models.user import AccountStatus, User
from backend.schemas.auth import AuthResponse, TokenResponse
from backend.schemas.user import AuthenticatedUser, with_provider_flags
from backend.services.session_service import SessionService
from backend.services.user_service import UserService


logger = logging.getLogger(__name__)

Provider = Literal["google", "apple"]

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = {
    "accounts.google.com",
    "https://accounts.google.com",
}
APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"

# PyJWKClient cache per provider (key rotation handled by PyJWT's
# cache_keys=True default behavior on kid miss).
_jwks_clients: dict[str, pyjwt.PyJWKClient] = {}


# ++++++++++++++++ EXCEPTIONS ++++++++++++++++
class OAuthError(Exception):
    code = "OAUTH_ERROR"
    status_code = 400

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class OAuthNotConfiguredError(OAuthError):
    code = "OAUTH_NOT_CONFIGURED"
    status_code = 503


class InvalidOAuthTokenError(OAuthError):
    code = "INVALID_OAUTH_TOKEN"
    status_code = 401


class OAuthConflictError(OAuthError):
    code = "OAUTH_CONFLICT"
    status_code = 409


class OAuthAccountBlockedError(OAuthError):
    code = "INVALID_CREDENTIALS"
    status_code = 401


# ++++++++++++++++ TOKEN VERIFICATION ++++++++++++++++
def _jwks_client(
    provider: Provider,
    url: str,
) -> pyjwt.PyJWKClient:
    client = _jwks_clients.get(provider)
    if client is None:
        client = pyjwt.PyJWKClient(url)
        _jwks_clients[provider] = client
    return client


def _decode_with_jwks(
    id_token: str,
    *,
    provider: Provider,
    jwks_url: str,
    issuers: set[str],
    audience: str,
    key_fetcher: Callable[[str], Any] | None = None,
) -> dict[str, Any]:
    """Verify signature/issuer/audience/expiry; return claims.

    key_fetcher(token) -> signing key override for tests (skips
    network). Production passes None and uses the cached JWKS.
    """
    if not id_token or not id_token.strip():
        raise InvalidOAuthTokenError("Invalid provider credential.")
    try:
        if key_fetcher is not None:
            signing_key = key_fetcher(id_token)
        else:
            signing_key = _jwks_client(provider, jwks_url).get_signing_key_from_jwt(
                id_token
            )
        claims = pyjwt.decode(
            id_token,
            signing_key,
            algorithms=["RS256"],
            audience=audience,
            issuer=list(issuers),
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except pyjwt.PyJWTError as exc:
        raise InvalidOAuthTokenError(
            "Invalid provider credential."
        ) from exc
    if not claims.get("sub"):
        raise InvalidOAuthTokenError("Invalid provider credential.")
    return claims


def verify_google_id_token(
    id_token: str,
    key_fetcher: Callable[[str], Any] | None = None,
) -> dict[str, Any]:
    """Verify a Google ID token; return its claims."""
    client_id = (settings.google_client_id or "").strip()
    if not client_id:
        raise OAuthNotConfiguredError(
            "Google sign-in is not configured."
        )
    return _decode_with_jwks(
        id_token,
        provider="google",
        jwks_url=GOOGLE_CERTS_URL,
        issuers=GOOGLE_ISSUERS,
        audience=client_id,
        key_fetcher=key_fetcher,
    )


def verify_apple_identity_token(
    identity_token: str,
    key_fetcher: Callable[[str], Any] | None = None,
) -> dict[str, Any]:
    """Verify an Apple identity token; return its claims."""
    client_id = (settings.apple_client_id or "").strip()
    if not client_id:
        raise OAuthNotConfiguredError(
            "Apple sign-in is not configured."
        )
    return _decode_with_jwks(
        identity_token,
        provider="apple",
        jwks_url=APPLE_KEYS_URL,
        issuers={APPLE_ISSUER},
        audience=client_id,
        key_fetcher=key_fetcher,
    )


# ++++++++++++++++ CLAIMS ++++++++++++++++
def _email_verified(claims: dict[str, Any]) -> bool:
    value = claims.get("email_verified")
    return value is True or value == "true"


def _ensure_may_authenticate(user: User) -> None:
    if not user.is_active or user.deleted_at is not None:
        raise OAuthAccountBlockedError("Invalid credentials.")
    if user.account_status in (
        AccountStatus.SUSPENDED,
        AccountStatus.DISABLED,
        AccountStatus.DELETED,
    ):
        raise OAuthAccountBlockedError("Invalid credentials.")


# ++++++++++++++++ AUTHENTICATE ++++++++++++++++
async def authenticate_with_provider(
    db: AsyncSession,
    provider: Provider,
    claims: dict[str, Any],
    *,
    device_id: str,
    device_name: str | None = None,
    platform: str | None = None,
    app_version: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuthResponse:
    """
    Resolve-or-create the JodTod user for verified provider claims
    and open a normal authenticated session.

    Linking policy (safe, no silent merges):
      subject known            -> that user logs in;
      subject new + verified email matches a user
                               -> link subject, that user logs in,
                                  unless already linked to a
                                  different subject (409);
      otherwise                -> brand-new user (no password).
    """
    subject = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower() or None
    email_ok = _email_verified(claims) and email is not None
    name = str(claims.get("name") or "").strip() or None

    if not subject:
        raise InvalidOAuthTokenError("Invalid provider credential.")
    resolved_device = (device_id or "").strip()
    if not resolved_device:
        raise OAuthAccountBlockedError("Invalid credentials.")

    subject_field = (
        "google_subject" if provider == "google" else "apple_subject"
    )

    async with transaction(db):
        user = await UserService.get_by_provider_subject(
            db, provider, subject
        )

        if user is None and email_ok and email is not None:
            candidate = await UserService.get_by_email(db, email)
            if candidate is not None:
                existing = getattr(candidate, subject_field)
                if existing is not None and existing != subject:
                    raise OAuthConflictError(
                        "This account is already linked to a "
                        "different identity. Use the original "
                        "sign-in method."
                    )
                setattr(candidate, subject_field, subject)
                if email == (candidate.email or "").lower():
                    candidate.email_verified = True
                    if (
                        candidate.account_status
                        == AccountStatus.PENDING
                    ):
                        candidate.account_status = AccountStatus.ACTIVE
                user = candidate

        if user is None:
            user = User(
                name=name,
                email=email if email_ok else None,
                phone=None,
                password_hash=None,
                email_verified=email_ok,
                phone_verified=False,
                account_status=(
                    AccountStatus.ACTIVE
                    if email_ok
                    else AccountStatus.PENDING
                ),
                is_active=True,
            )
            setattr(user, subject_field, subject)
            db.add(user)
            await db.flush()

        _ensure_may_authenticate(user)

        session, refresh_token = await SessionService.issue_session(
            db,
            user,
            resolved_device,
            device_name=device_name,
            platform=platform,
            app_version=app_version,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        access_token = create_access_token(
            user_id=user.id,
            session_id=session.id,
        )

        user.last_login_at = datetime.now(timezone.utc)

    await db.refresh(user)

    return AuthResponse(
        user=with_provider_flags(
            AuthenticatedUser.model_validate(user),
            google_subject=user.google_subject,
            apple_subject=user.apple_subject,
        ),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_seconds,
            refresh_expires_in=settings.refresh_token_expire_seconds,
            session_id=session.id,
        ),
    )
