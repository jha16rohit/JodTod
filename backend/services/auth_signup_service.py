"""
JodTod Authentication - Signup Service

Responsibilities:
    - Validate signup business rules
    - Normalize email/phone identifiers
    - Detect duplicate accounts
    - Hash passwords securely
    - Create the User record
    - Create the initial authenticated Session
    - Generate access/refresh authentication credentials
    - Persist only the refresh-token hash
    - Commit user + session atomically

Important:
    - Plaintext passwords are never persisted.
    - Raw refresh tokens are never persisted.
    - This service contains business logic only.
    - FastAPI route handling belongs in auth_signup.py.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.core.security import (
    generate_secure_token,
    hash_password,
    hash_token,
)
from backend.core.jwt import create_access_token
from backend.database import transaction
from backend.models.session import Session
from backend.models.user import AccountStatus, User
from backend.schemas.auth import AuthResponse, SignupRequest, TokenResponse
from backend.schemas.user import AuthenticatedUser, with_provider_flags
from backend.services.email_verification_service import (
    send_signup_verification_best_effort,
)


# ++++++++++++++++ EXCEPTIONS ++++++++++++++++
class SignupError(Exception):
  """Raised when signup fails due to business rule violations."""

  code = "SIGNUP_ERROR"

  def __init__(self, message:str) -> None:
    self.message = message
    super().__init__(message)


class DuplicateAccountError(SignupError):
  """Raised when a duplicate account is detected during signup, the email or phone number is already in use."""

  code = "ACCOUNT_ALREADY_EXISTS"


class InvalidSignupError(SignupError):
  """Raised when the signup request is invalid, such as missing required fields or failing validation."""

  code = "INVALID_SIGNUP_REQUEST"



# ++++++++++++++++ NORMALIZATION ++++++++++++++++
def normalize_email(email:str | None) -> str | None:
  """Normalize an email address before database lookup/storage.
    EmailStr from Pydantic has already performed syntax validation, but normalization still needs to happen consistently."""

  if email is None:
    return None

  normalized_email = str(email).strip().lower()
  return normalized_email or None


def normalize_phone(phone:str | None) -> str | None:
  """Normalize a phone number before database lookup/storage.
    PhoneStr from Pydantic has already performed syntax validation, but normalization still needs to happen consistently."""

  if phone is None:
    return None

  normalized_phone = str(phone).strip()
  return normalized_phone or None



# ++++++++++++++++ VALIDATION ++++++++++++++++
def _validate_signup_payload(
    payload:SignupRequest, 
    email: str | None,
    phone: str | None,
) -> None:
  """Validate the signup payload against business rules.
    Raises DuplicateAccountError if a duplicate account is detected."""

  if not email and not phone:
    raise InvalidSignupError("Either email or phone number must be provided.")

  if not payload.password:
    raise InvalidSignupError("Password is required for password-based signup..")

  if len(payload.password) < settings.password_min_length:
    raise InvalidSignupError(f"Password must be at least {settings.password_min_length} characters long.")

  if len(payload.password) > settings.password_max_length:
    raise InvalidSignupError(f"Password must be no more than {settings.password_max_length} characters long.")

  if payload.name is not None:
    name = payload.name.strip()

    if not name:
      raise InvalidSignupError("Name cannot be empty or whitespace.")


# ++++++++++++++++ DUPLICATE ACCOUNT CHECK ++++++++++++++++
async def _find_existing_account(
    db: AsyncSession,
    email: str | None,
    phone: str | None, 
) -> User | None:
  """Find an existing user account matching the supplied identifiers.
    Both email and phone are checked when available."""

  conditions = []

  if email:
    conditions.append(User.email == email)

  if phone:
    conditions.append(User.phone == phone)

  if not conditions:
    return None

  result = await db.execute(
    select(User).where(or_(*conditions))
  )

  return result.scalar_one_or_none()



# ++++++++++++++++ TOKEN CREATION ++++++++++++++++
def _create_refresh_token() -> str:
    """
    Generate a high-entropy refresh token.

    The raw token is returned to the client only.
    The database receives only its SHA-256 digest.
    """

    return generate_secure_token(48)


def _create_access_token(
  user_id: uuid.UUID, 
  session_id: uuid.UUID
) -> str:
  """
  Create the access token for the newly authenticated user.

  NOTE:
  The actual JWT implementation should remain centralized in the
  project's authentication/security layer.

  This function expects the project to expose a JWT creation
  utility there.
  """

  return create_access_token(
      user_id=str(user_id),
      session_id=session_id,
  )


# ++++++++++++++++ SIGNUP ++++++++++++++++
async def create_account(
    db: AsyncSession,
    payload: SignupRequest,
    *,
    device_id: str,
    device_name: str | None = None,
    platform: str | None = None,
    app_version: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuthResponse:
    """
    Create a new user account and an initial authenticated session.

    Responsibilities:
    - Validate the signup payload against business rules.
    - Normalize email and phone identifiers.
    - Check for duplicate accounts.
    - Hash the password securely.
    - Create the User record in the database.
    - Generate access and refresh tokens.
    - Persist only the refresh token hash.
    - Commit user and session atomically.

    Raises:
        DuplicateAccountError: If a duplicate account is detected.
        InvalidSignupError: If the signup request is invalid.
        SignupError: For other signup-related errors.

    Returns:
        AuthResponse: The authenticated session response containing
                      access and refresh tokens, and user info.
    """

    # Normalize identifiers
    email = normalize_email(payload.email)
    phone = normalize_phone(payload.phone)

    # Validate payload
    _validate_signup_payload(payload=payload, email=email, phone=phone)

    if not device_id or not device_id.strip():
      raise InvalidSignupError("Device ID is required.")

    device_id = device_id.strip()

    try:
      async with transaction(db):

        # ------------------------------------------------
        # 3A. Duplicate account check
        # ------------------------------------------------
        existing_user = await _find_existing_account(
            db=db,
            email=email,
            phone=phone,
        )

        if existing_user is not None:
            if (email and existing_user.email == email):
                raise DuplicateAccountError("An account already exists with this email.")

            if (phone and existing_user.phone == phone):
                raise DuplicateAccountError("An account already exists with this phone number.")

            raise DuplicateAccountError("An account already exists with the supplied credentials.")

        # ------------------------------------------------
        # 3B. Hash password
        # ------------------------------------------------
        if payload.password is None:
          raise InvalidSignupError(
            "Password is required for password-based signup."
          )

        password_hash = hash_password(
            payload.password
        )

        # ------------------------------------------------
        # 3C. Determine initial account status
        # ------------------------------------------------
        account_status = AccountStatus.PENDING

        # ------------------------------------------------
        # 3D. Create user
        # ------------------------------------------------
        user = User(
        name=(
            payload.name.strip()
            if payload.name
            else None
          ),
          email=email,
          phone=phone,
          password_hash=password_hash,
          email_verified=False,
          phone_verified=False,
          account_status=AccountStatus.PENDING,
          is_active=True,
        )

        db.add(user)

        # Flush assigns the UUID before creating the session.
        await db.flush()

        now = datetime.now(timezone.utc)

        # ------------------------------------------------
        # 3E. Generate authentication credentials
        # ------------------------------------------------
        refresh_token = generate_secure_token(48)

        # ------------------------------------------------
        # 3F. Calculate session expiration
        # ------------------------------------------------
        now = datetime.now(timezone.utc)
        session_expires_at = (
            now
            + timedelta(
                days=settings.refresh_token_expire_days
            )
        )

        # ------------------------------------------------
        # 3G. Create authenticated device session
        # ------------------------------------------------
        session = Session(
          user_id=user.id,
          device_id=device_id,
          device_name=device_name,
          platform=platform,
          app_version=app_version,
          refresh_token_hash=hash_token(
              refresh_token
            ),
          token_family_id=uuid.uuid4(),
          expires_at=session_expires_at,
          last_used_at=now,
          revoked_at=None,
          revoke_reason=None,
          ip_address=ip_address,
          user_agent=user_agent,
          is_active=True,
        )

        db.add(session)

        await db.flush()

        # Session ID now exists.
        access_token = create_access_token(
          user_id=user.id,
          session_id=session.id,
        )

        # ------------------------------------------------
        # 3H. Update last-login timestamp
        # ------------------------------------------------
        user.last_login_at = now


      # ----------------------------------------------------
      # The commit above emits an UPDATE for last_login_at, which
      # expires the server-generated updated_at (onupdate) column.
      # Reload the user while the session is still open so that
      # response serialization below performs no lazy IO
      # (sync attribute access in async context would raise
      # MissingGreenlet).
      # ----------------------------------------------------
      await db.refresh(user)
      # refresh() autobegins a read transaction on the session; close it
      # so the best-effort verification dispatch below owns and commits
      # its own transactions (otherwise the OTP row would join this
      # stray read transaction and roll back on session close).
      await db.commit()

      # ----------------------------------------------------
      # 4. Verification runs alongside the immediate session.
      #
      # Contract note: signup keeps its Phase-2 immediate-session
      # behavior (AuthResponse is returned so the client can enter
      # the app). Verification is dispatched best-effort here and
      # can never fail the signup; newly verified PENDING accounts
      # flip to ACTIVE in the verification services.
      # ----------------------------------------------------
      await send_signup_verification_best_effort(
          db,
          email=email,
          phone=phone,
      )

      # ----------------------------------------------------
      # 5. Construct response
      # ----------------------------------------------------
      access_token_expires_in = (
          settings.access_token_expire_seconds
      )

      refresh_token_expires_in = (
          settings.refresh_token_expire_seconds
      )

      return AuthResponse(
          user=with_provider_flags(
              AuthenticatedUser.model_validate(
                  user
              ),
              google_subject=user.google_subject,
              apple_subject=user.apple_subject,
          ),
          tokens=TokenResponse(
              access_token=access_token,
              refresh_token=refresh_token,
              token_type="bearer",
              expires_in=access_token_expires_in,
              refresh_expires_in=refresh_token_expires_in,
              session_id=session.id,
          ),
      )

    # --------------------------------------------------------
    # 5. Database integrity protection
    # --------------------------------------------------------
    except IntegrityError as exc:

        # Unique constraints on email/phone can still reject
        # concurrent signup requests even after the duplicate
        # pre-check.
        #
        # Never expose raw database errors to the client.

        raise DuplicateAccountError(
            "An account already exists with the supplied email or phone."
        ) from exc