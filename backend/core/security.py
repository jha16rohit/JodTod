# backend/core/security.py

import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHash, VerificationError, VerifyMismatchError


# ============================================================
# PASSWORD HASHING
# ============================================================

# Argon2id (matches password_hash_algorithm=argon2id). Called without
# a `salt` keyword so it works on both argon2-cffi 21.x (hash(password))
# and 25.x (hash(password, *, salt=None)); pwdlib 0.3.1's Argon2Hasher
# passes salt=... unconditionally and crashes on 21.x.
_password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """
    Hash a user's password with Argon2id.
    """

    if not password:
        raise ValueError("Password cannot be empty.")

    return _password_hasher.hash(password)


def verify_password(
    plain_password: str,
    password_hash: str,
) -> bool:
    """
    Verify a plaintext password against the stored password hash.

    Argon2 PHC hashes generated via pwdlib share the same format, so
    existing stored hashes keep verifying. Unknown/legacy formats fall
    back to pwdlib verification when available.
    """

    if not plain_password or not password_hash:
        return False

    try:
        return _password_hasher.verify(password_hash, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHash):
        pass
    except Exception:
        return False

    try:
        from pwdlib import PasswordHash

        return bool(
            PasswordHash.recommended().verify(plain_password, password_hash)
        )
    except Exception:
        return False


# ============================================================
# SECURE RANDOM TOKEN
# ============================================================

def generate_secure_token(
    length: int = 32,
) -> str:
    """
    Generate a cryptographically secure URL-safe token.

    Used for things such as:
    - refresh tokens
    - email verification tokens
    - password reset tokens
    """

    if length < 16:
        raise ValueError(
            "Token length must be at least 16 bytes."
        )

    return secrets.token_urlsafe(length)


# ============================================================
# OTP
# ============================================================

def generate_otp(
    length: int = 6,
) -> str:
    """
    Generate a cryptographically secure numeric OTP.
    """

    if not 4 <= length <= 10:
        raise ValueError(
            "OTP length must be between 4 and 10."
        )

    minimum = 10 ** (length - 1)
    maximum = (10 ** length) - 1

    return str(
        secrets.randbelow(
            maximum - minimum + 1
        ) + minimum
    )


# ============================================================
# TOKEN HASHING
# ============================================================

def hash_token(token: str) -> str:
    """
    SHA-256 hash of a token.

    The raw token should be sent to the client, while only this
    hash should be stored in the database.
    """

    if not token:
        raise ValueError("Token cannot be empty.")

    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def verify_token(
    token: str,
    stored_hash: str,
) -> bool:
    """
    Compare a raw token against its stored SHA-256 hash.
    """

    if not token or not stored_hash:
        return False

    calculated_hash = hash_token(token)

    return secrets.compare_digest(
        calculated_hash,
        stored_hash,
    )


# ============================================================
# SESSION TOKEN
# ============================================================

def generate_session_token() -> str:
    """
    Generate high-entropy random session material.
    """

    return secrets.token_urlsafe(48)