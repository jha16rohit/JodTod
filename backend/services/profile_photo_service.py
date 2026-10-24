# backend/services/profile_photo_service.py

"""
Profile-photo storage for the authenticated user.

Local-filesystem storage (no paid infrastructure): files live under
``backend/uploads/profile_photos/`` and are served by the API at
``/uploads/...``. PostgreSQL (users.avatar_url) is the source of truth
for the persisted reference — a relative path such as
``/uploads/profile_photos/<uuid>.jpg``.

Safety rules:
- caller passes the already-authenticated User; no client user_id.
- MIME type, extension, and size are validated before anything is stored.
- stored filenames are server-generated UUIDs; the original filename
  is never trusted or used.
- the old photo is deleted only AFTER the new reference is committed.
- a failed upload never mutates the existing avatar_url.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Final

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import transaction
from backend.models.user import User

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_ROOT: Final[Path] = BASE_DIR / "uploads" / "profile_photos"

MAX_PHOTO_BYTES: Final[int] = 5 * 1024 * 1024  # 5 MB

ALLOWED_CONTENT_TYPES: Final[dict[str, str]] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

ALLOWED_EXTENSIONS: Final[set[str]] = {".jpg", ".jpeg", ".png", ".webp"}


class ProfilePhotoError(Exception):
    """Base error for profile-photo operations."""

    def __init__(self, message: str, code: str = "PHOTO_ERROR") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class InvalidPhotoError(ProfilePhotoError):
    """Raised when the uploaded file fails validation (400)."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="INVALID_PHOTO")


class PhotoTooLargeError(ProfilePhotoError):
    """Raised when the upload exceeds the size limit (413)."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="PHOTO_TOO_LARGE")


class PhotoStorageError(ProfilePhotoError):
    """Raised when the file cannot be stored (500)."""

    def __init__(self, message: str = "Could not store the profile photo.") -> None:
        super().__init__(message, code="PHOTO_STORAGE_FAILED")


def _resolve_extension(content_type: str | None, filename: str | None) -> str:
    """
    Resolve a safe extension from the validated content type.

    The content type wins; the original filename extension is only a
    fallback and must itself be allowlisted. Never returns an
    unvalidated extension.
    """
    if content_type:
        normalized = content_type.split(";")[0].strip().lower()
        if normalized in ALLOWED_CONTENT_TYPES:
            return ALLOWED_CONTENT_TYPES[normalized]

    if filename and "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].strip().lower()
        if ext in ALLOWED_EXTENSIONS:
            return ".jpg" if ext == ".jpeg" else ext

    raise InvalidPhotoError(
        "Unsupported image type. Use JPEG, PNG, or WebP."
    )


def _avatar_path(avatar_url: str | None) -> Path | None:
    """Resolve a stored avatar_url to an on-disk path, or None."""
    if not avatar_url:
        return None
    # Only paths we generated (under /uploads/profile_photos/) resolve
    # inside UPLOAD_ROOT; anything else is ignored to prevent path traversal.
    name = avatar_url.strip().replace("\\", "/").split("/")[-1]
    if not name or name in (".", ".."):
        return None
    candidate = UPLOAD_ROOT / name
    try:
        candidate.resolve().relative_to(UPLOAD_ROOT.resolve())
    except (ValueError, OSError):
        return None
    return candidate


class ProfilePhotoService:
    """Upload / replacement / removal for the authenticated user's photo."""

    @staticmethod
    async def set_profile_photo(
        db: AsyncSession,
        user: User,
        upload: UploadFile,
    ) -> str:
        """
        Validate, store, and persist a new profile photo.

        Returns the new avatar_url. The previous file is removed only
        after the new reference commits. On any failure the existing
        avatar_url is left untouched.
        """
        extension = _resolve_extension(upload.content_type, upload.filename)

        try:
            contents = await upload.read()
        except Exception as exc:
            raise PhotoStorageError() from exc
        finally:
            try:
                await upload.close()
            except Exception:
                pass

        if not contents:
            raise InvalidPhotoError("The uploaded file is empty.")

        if len(contents) > MAX_PHOTO_BYTES:
            raise PhotoTooLargeError(
                "The image is too large. Maximum size is 5 MB."
            )

        UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{extension}"
        dest = UPLOAD_ROOT / filename

        try:
            dest.write_bytes(contents)
        except OSError as exc:
            raise PhotoStorageError() from exc

        previous_url = user.avatar_url
        new_url = f"/uploads/profile_photos/{filename}"

        try:
            async with transaction(db):
                user.avatar_url = new_url
                await db.flush()
        except Exception:
            # DB did not persist: remove the orphan file, keep old reference.
            try:
                dest.unlink(missing_ok=True)
            except OSError:
                pass
            raise

        # New reference is safely persisted; clean up the old file.
        previous_path = _avatar_path(previous_url)
        if previous_path is not None and previous_path != dest:
            try:
                previous_path.unlink(missing_ok=True)
            except OSError:
                pass

        return new_url

    @staticmethod
    async def clear_profile_photo(
        db: AsyncSession,
        user: User,
    ) -> None:
        """
        Clear the avatar reference and delete the stored file.

        Safe when no photo exists or the file is already missing.
        Only touches the authenticated user's own record.
        """
        previous_url = user.avatar_url

        async with transaction(db):
            user.avatar_url = None
            await db.flush()

        previous_path = _avatar_path(previous_url)
        if previous_path is not None:
            try:
                previous_path.unlink(missing_ok=True)
            except OSError:
                pass
