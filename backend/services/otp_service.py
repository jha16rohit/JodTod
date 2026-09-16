"""
JodTod Authentication - OTP Service (generic 6-digit code core).

Responsibilities:
    - Generate cryptographically random 6-digit OTP codes.
    - Persist only the SHA-256 hash (never plaintext).
    - Enforce expiry, attempt limits, resend cooldown, lockout.
    - Invalidate superseded codes when a new one is issued.
    - Track purpose + destination on every record.
    - Deliver through the vendor-neutral provider abstraction.
    - Expose rate-limit hooks (in-memory sliding window; swap for
      Redis/a gateway limiter without touching business logic).

Important:
    - Purpose values reuse the existing OTPPurpose enum, so no schema
      migration is required:
        PHONE_SIGNUP_VERIFICATION -> PHONE_VERIFICATION
        PHONE_LOGIN               -> PHONE_LOGIN
        PHONE_PASSWORD_RESET      -> PASSWORD_RESET (+destination_type PHONE)
        EMAIL_VERIFICATION        -> EMAIL_VERIFICATION
        EMAIL password reset      -> PASSWORD_RESET (+destination_type EMAIL)
    - Domain side effects (verified flags, sessions, password changes)
      belong in the thin domain services, not here.
    - This module never logs an OTP value.
"""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.core.security import hash_token, verify_token
from backend.database import transaction
from backend.models.otp import OTP, OTPDestinationType, OTPPurpose
from backend.services.otp_providers import (
    ProviderDeliveryError,
    get_email_provider,
    get_sms_provider,
)


# Spec mandates exactly 6 digits (settings.otp_length default agrees).
OTP_LENGTH = 6

# In-memory sliding-window counters: (scope, key) -> [epoch seconds].
# Hook point: replace _check_rate_limit/_record_send with a shared
# store (Redis, gateway) for multi-worker deployments.
_rate_counters: dict[tuple[str, str], list[float]] = {}


# ++++++++++++++++ EXCEPTIONS ++++++++++++++++
class OTPError(Exception):
    """Base class for OTP failures (safe messages only)."""

    code = "OTP_ERROR"
    status_code = 400

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class OTPNotFoundError(OTPError):
    code = "OTP_NOT_FOUND"
    status_code = 404


class OTPInvalidError(OTPError):
    code = "OTP_INVALID"


class OTPExpiredError(OTPError):
    code = "OTP_EXPIRED"


class OTPConsumedError(OTPError):
    code = "OTP_ALREADY_USED"


class OTPLockedError(OTPError):
    code = "OTP_TOO_MANY_ATTEMPTS"
    status_code = 429


class OTPCooldownError(OTPError):
    code = "OTP_COOLDOWN"
    status_code = 429


class OTPRateLimitedError(OTPError):
    code = "OTP_RATE_LIMITED"
    status_code = 429


# ++++++++++++++++ RESULT ++++++++++++++++
@dataclass
class OTPDispatch:
    """Outcome of issuing an OTP."""

    record_id: object
    destination: str
    expires_at: datetime
    resend_available_at: datetime | None
    # Populated ONLY when environment-gated dev disclosure applies
    # (non-production + mock provider). Never set in production.
    dev_code: str | None = None


# ++++++++++++++++ HELPERS ++++++++++++++++
def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_destination(
    destination: str,
    purpose: OTPPurpose,
) -> tuple[str, OTPDestinationType]:
    value = (destination or "").strip()
    if not value:
        raise OTPInvalidError("A destination is required.")
    if purpose in (
        OTPPurpose.PHONE_SIGNUP,
        OTPPurpose.PHONE_LOGIN,
        OTPPurpose.PHONE_VERIFICATION,
    ):
        return value, OTPDestinationType.PHONE
    if purpose in (
        OTPPurpose.EMAIL_SIGNUP,
        OTPPurpose.EMAIL_LOGIN,
        OTPPurpose.EMAIL_VERIFICATION,
    ):
        return value.lower(), OTPDestinationType.EMAIL
    # PASSWORD_RESET serves both channels; infer from shape.
    if "@" in value:
        return value.lower(), OTPDestinationType.EMAIL
    return value, OTPDestinationType.PHONE


def _generate_code() -> str:
    """Cryptographically random 6-digit code (may include leading 0)."""
    return "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))


def _check_rate_limit(scope: str, key: str) -> None:
    """Sliding-window send cap (hook point for a shared store)."""
    now = time.monotonic()
    window = 3600.0
    bucket = _rate_counters.setdefault((scope, key), [])
    cutoff = now - window
    del bucket[: next(
        (i for i, t in enumerate(bucket) if t > cutoff), len(bucket)
    )]
    if len(bucket) >= settings.otp_rate_limit_max_per_hour:
        raise OTPRateLimitedError(
            "Too many codes requested. Try again later."
        )
    bucket.append(now)


async def _latest_active_record(
    db: AsyncSession,
    purpose: OTPPurpose,
    destination: str,
) -> OTP | None:
    result = await db.execute(
        select(OTP)
        .where(
            OTP.purpose == purpose,
            OTP.destination == destination,
            OTP.consumed_at.is_(None),
        )
        .order_by(OTP.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _dev_disclosure_allowed(channel_mock: bool) -> bool:
    """OTP echo allowed only in non-production with a mock channel."""
    return settings.dev_otp_disclosure_allowed and channel_mock


# ++++++++++++++++ ISSUE ++++++++++++++++
async def request_otp(
    db: AsyncSession,
    *,
    destination: str,
    purpose: OTPPurpose,
    user_id=None,
    subject: str = "Your JodTod code",
) -> OTPDispatch:
    """
    Issue a fresh OTP, superseding prior active ones.

    Raises OTPCooldownError / OTPRateLimitedError / ProviderDeliveryError.
    """
    normalized, dest_type = _normalize_destination(destination, purpose)
    scope = f"otp:{purpose.value}"

    async with transaction(db):
        _check_rate_limit(scope, normalized)

        now = _utcnow()
        previous = await _latest_active_record(db, purpose, normalized)
        if previous is not None:
            if (
                previous.resend_available_at is not None
                and previous.resend_available_at > now
            ):
                retry_after = int(
                    (previous.resend_available_at - now).total_seconds()
                )
                raise OTPCooldownError(
                    "A code was just sent. "
                    f"Retry in {max(retry_after, 1)} seconds."
                )
            # Supersede: old codes become unusable when a new one ships.
            previous.consumed_at = now

        code = _generate_code()
        expires_at = now + timedelta(seconds=settings.otp_expire_seconds)
        resend_available_at = now + timedelta(
            seconds=settings.otp_resend_cooldown_seconds
        )

        record = OTP(
            user_id=user_id,
            purpose=purpose,
            destination_type=dest_type,
            destination=normalized,
            otp_hash=hash_token(code),
            expires_at=expires_at,
            attempts=0,
            max_attempts=settings.otp_max_attempts,
            consumed_at=None,
            sent_at=now,
            resend_available_at=resend_available_at,
            locked_until=None,
        )
        db.add(record)
        await db.flush()

        channel_mock = True
        try:
            if dest_type == OTPDestinationType.PHONE:
                provider = get_sms_provider()
                channel_mock = provider.name == "mock"
                message = (
                    f"Your JodTod code is {code}. "
                    f"It expires in {settings.otp_expire_seconds // 60} minutes."
                )
                await provider.send_otp(normalized, message)
            else:
                provider = get_email_provider()
                channel_mock = provider.name == "mock"
                await provider.send_otp_email(
                    normalized,
                    subject,
                    f"Your JodTod code is {code}. "
                    f"It expires in {settings.otp_expire_seconds // 60} minutes.",
                )
        except ProviderDeliveryError:
            # Delivery failure rolls back issuance: no dangling code the
            # user can never receive.
            raise

        dev_code = code if _dev_disclosure_allowed(channel_mock) else None

        return OTPDispatch(
            record_id=record.id,
            destination=normalized,
            expires_at=expires_at,
            resend_available_at=resend_available_at,
            dev_code=dev_code,
        )


# ++++++++++++++++ VERIFY ++++++++++++++++
async def verify_otp_code(
    db: AsyncSession,
    *,
    destination: str,
    purpose: OTPPurpose,
    code: str,
) -> OTP:
    """
    Verify a code against the latest active record.

    On success the record is consumed (single-use) and returned.
    Raises OTPNotFoundError / OTPConsumedError / OTPExpiredError /
    OTPLockedError / OTPInvalidError. Unknown destinations and wrong
    codes share the same generic message.
    """
    normalized, _ = _normalize_destination(destination, purpose)
    candidate = (code or "").strip()

    async with transaction(db):
        now = _utcnow()
        record = await _latest_active_record(db, purpose, normalized)

        if record is None:
            # Distinguish "code already used" from "no code sent" so
            # the UI can suggest requesting a fresh code. Neither case
            # reveals account information (destination is caller-given).
            prior = await db.execute(
                select(OTP.id)
                .where(
                    OTP.purpose == purpose,
                    OTP.destination == normalized,
                )
                .limit(1)
            )
            if prior.scalar_one_or_none() is not None:
                raise OTPConsumedError(
                    "This code was already used. Request a new one."
                )
            raise OTPNotFoundError("Invalid or expired code.")

        if (
            record.locked_until is not None
            and record.locked_until > now
        ):
            raise OTPLockedError(
                "Too many attempts. Request a new code later."
            )

        if record.expires_at <= now:
            record.consumed_at = now
            raise OTPExpiredError(
                "This code has expired. Request a new one."
            )

        if not candidate or not verify_token(candidate, record.otp_hash):
            record.attempts = (record.attempts or 0) + 1
            if record.attempts >= (record.max_attempts or 1):
                record.locked_until = now + timedelta(
                    seconds=settings.otp_expire_seconds
                )
                raise OTPLockedError(
                    "Too many attempts. Request a new code later."
                )
            raise OTPInvalidError("Invalid or expired code.")

        record.consumed_at = now
        return record
