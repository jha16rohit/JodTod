# backend/services/group_service.py

"""
Group lifecycle for the authenticated user.

Groups are the common container for shared financial activity. Every
query is scoped to membership: a user can only see or mutate groups
they belong to, and strangers read as 404 (never a membership oracle).
"""

from __future__ import annotations

import re
import secrets
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import transaction
from backend.models.group import (
    Group,
    GroupLifecycle,
    GroupMember,
    GroupType,
    MemberRole,
)
from backend.models.user import User
from backend.services.notification_service import NotificationService


class GroupNotFoundError(Exception):
    """No such group for this user (mapped to 404)."""


class GroupPermissionError(Exception):
    """Membership exists but the role may not act (mapped to 403)."""


class GroupValidationError(Exception):
    """Bad group input (mapped to 422)."""


VALID_GROUP_TYPES = {item.value for item in GroupType}
_CURRENCY_RE = re.compile(r"^[A-Z]{3}$")


def _normalize_currency(raw: object) -> str:
    code = str(raw or "INR").strip().upper()
    if not _CURRENCY_RE.match(code):
        raise GroupValidationError(
            "Currency must be a 3-letter ISO code."
        )
    return code


def _generate_invite_code() -> str:
    return secrets.token_hex(4).upper()


class GroupService:
    """Create/list/detail/join/archive groups for the authenticated user."""

    # ============================================================
    # CREATE
    # ============================================================

    @staticmethod
    async def create_group(
        db: AsyncSession,
        creator_id: UUID,
        name: str,
        description: str | None = None,
        group_type: str = GroupType.OTHER.value,
        currency: str = "INR",
        member_user_ids: list[UUID] | None = None,
        image_url: str | None = None,
    ) -> Group:
        clean_name = (name or "").strip()
        if not clean_name or len(clean_name) > 120:
            raise GroupValidationError(
                "Group name is required (max 120 characters)."
            )
        if group_type not in VALID_GROUP_TYPES:
            raise GroupValidationError(
                f"Unsupported group type: {group_type}."
            )
        code = _normalize_currency(currency)
        if description is not None and len(description) > 500:
            raise GroupValidationError(
                "Description must be at most 500 characters."
            )
        if image_url is not None and len(image_url) > 500:
            raise GroupValidationError(
                "Image URL must be at most 500 characters."
            )

        member_ids = {creator_id}
        if member_user_ids:
            for candidate in member_user_ids:
                member_ids.add(candidate)
            existing = set(
                (
                    await db.execute(
                        select(User.id).where(User.id.in_(member_ids))
                    )
                )
                .scalars()
                .all()
            )
            unknown = [str(m) for m in member_ids if m not in existing]
            if unknown:
                raise GroupValidationError(
                    "Unknown member user ids: " + ", ".join(unknown)
                )

        async with transaction(db):
            group = Group(
                name=clean_name,
                description=(description or "").strip() or None,
                group_type=GroupType(group_type),
                currency=code,
                image_url=image_url,
                lifecycle=GroupLifecycle.ACTIVE,
                invite_code=_generate_invite_code(),
                created_by=creator_id,
            )
            db.add(group)
            await db.flush()
            for member_id in member_ids:
                db.add(
                    GroupMember(
                        group_id=group.id,
                        user_id=member_id,
                        role=(
                            MemberRole.ADMIN
                            if member_id == creator_id
                            else MemberRole.MEMBER
                        ),
                    )
                )
            await db.flush()
        return group

    # ============================================================
    # READ (membership-scoped)
    # ============================================================

    @staticmethod
    async def list_my_groups(
        db: AsyncSession,
        user_id: UUID,
    ) -> list[Group]:
        result = await db.execute(
            select(Group)
            .join(GroupMember, GroupMember.group_id == Group.id)
            .where(GroupMember.user_id == user_id)
            .order_by(Group.updated_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_group_for_user(
        db: AsyncSession,
        user_id: UUID,
        group_id: UUID,
    ) -> Group | None:
        """Return the group only when the user is a member (else None)."""
        membership = await db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
            )
        )
        if membership is None:
            return None
        return await db.get(Group, group_id)

    @staticmethod
    async def require_membership(
        db: AsyncSession,
        user_id: UUID,
        group_id: UUID,
    ) -> GroupMember:
        membership = await db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
            )
        )
        if membership is None:
            raise GroupNotFoundError("Group not found.")
        return membership

    @staticmethod
    async def list_members(
        db: AsyncSession,
        group_id: UUID,
    ) -> list[GroupMember]:
        result = await db.execute(
            select(GroupMember).where(GroupMember.group_id == group_id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def member_user_ids(
        db: AsyncSession,
        group_id: UUID,
    ) -> set[UUID]:
        rows = await db.execute(
            select(GroupMember.user_id).where(
                GroupMember.group_id == group_id
            )
        )
        return set(rows.scalars().all())

    @staticmethod
    async def my_group_ids(
        db: AsyncSession,
        user_id: UUID,
    ) -> list[UUID]:
        rows = await db.execute(
            select(GroupMember.group_id).where(
                GroupMember.user_id == user_id
            )
        )
        return list(rows.scalars().all())

    @staticmethod
    async def get_by_invite_code(
        db: AsyncSession,
        invite_code: str,
    ) -> Group | None:
        code = (invite_code or "").strip().upper()
        if not code:
            return None
        return await db.scalar(
            select(Group).where(Group.invite_code == code)
        )

    # ============================================================
    # MEMBERSHIP MUTATIONS
    # ============================================================

    @staticmethod
    async def add_member(
        db: AsyncSession,
        requester_id: UUID,
        group_id: UUID,
        user_id: UUID,
    ) -> GroupMember:
        """Add a user to a group the requester belongs to (idempotent)."""
        await GroupService.require_membership(db, requester_id, group_id)
        target = await db.get(User, user_id)
        if target is None:
            raise GroupValidationError("User to add does not exist.")
        existing = await db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
            )
        )
        is_new_member = existing is None
        if is_new_member:
            async with transaction(db):
                row = GroupMember(
                    group_id=group_id,
                    user_id=user_id,
                    role=MemberRole.MEMBER,
                )
                db.add(row)
                await db.flush()

            # Notify existing members about new member
            group = await db.get(Group, group_id)
            member_ids = await GroupService.member_user_ids(db, group_id)
            member_users = {}
            if member_ids:
                member_rows = list(
                    (await db.execute(select(User).where(User.id.in_(member_ids)))).scalars().all()
                )
                member_users = {u.id: u for u in member_rows}

            new_member = member_users.get(user_id)
            new_member_name = new_member.name if new_member and new_member.name else "A new member"
            requester = member_users.get(requester_id)
            requester_name = requester.name if requester and requester.name else "An admin"

            for member_id in member_ids:
                if member_id == user_id:
                    continue
                await NotificationService.wire_member_joined_group(
                    db=db,
                    user_id=member_id,
                    group_id=group_id,
                    group_name=group.name if group else "Group",
                    by_user_name=requester_name,
                    context_data={
                        "group_id": str(group_id),
                        "group_name": group.name if group else "Group",
                        "member_name": new_member_name,
                        "member_id": str(user_id),
                        "added_by": requester_name,
                    },
                )
        else:
            row = existing
        return row

    @staticmethod
    async def join_by_code(
        db: AsyncSession,
        user_id: UUID,
        invite_code: str,
    ) -> Group:
        """Join a group via its invite code (idempotent re-join)."""
        group = await GroupService.get_by_invite_code(db, invite_code)
        if group is None:
            raise GroupNotFoundError("Invite code is invalid.")
        existing = await db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.user_id == user_id,
            )
        )
        is_new_member = existing is None
        if is_new_member:
            async with transaction(db):
                db.add(
                    GroupMember(
                        group_id=group.id,
                        user_id=user_id,
                        role=MemberRole.MEMBER,
                    )
                )
                await db.flush()

            # Notify existing members about new member
            member_ids = await GroupService.member_user_ids(db, group.id)
            member_users = {}
            if member_ids:
                member_rows = list(
                    (await db.execute(select(User).where(User.id.in_(member_ids)))).scalars().all()
                )
                member_users = {u.id: u for u in member_rows}

            new_member = member_users.get(user_id)
            new_member_name = new_member.name if new_member and new_member.name else "A new member"

            for member_id in member_ids:
                if member_id == user_id:
                    continue
                member = member_users.get(member_id)
                member_name = member.name if member and member.name else "Member"
                await NotificationService.wire_member_joined_group(
                    db=db,
                    user_id=member_id,
                    group_id=group.id,
                    group_name=group.name,
                    by_user_name=new_member_name,
                    context_data={
                        "group_id": str(group.id),
                        "group_name": group.name,
                        "member_name": new_member_name,
                        "member_id": str(user_id),
                    },
                )
        return group

    @staticmethod
    async def leave(
        db: AsyncSession,
        user_id: UUID,
        group_id: UUID,
    ) -> str:
        """
        Leave a group. Returns "left" or "deleted" (last member out
        removes the group; ledger rows cascade with it).

        When the departing member is the last admin, the oldest
        remaining member (deterministic id order) is promoted so the
        group never strands without an admin.
        """
        from sqlalchemy import delete as sa_delete

        membership = await GroupService.require_membership(
            db, user_id, group_id
        )
        members = await GroupService.list_members(db, group_id)
        remaining = [m for m in members if m.user_id != user_id]
        async with transaction(db):
            await db.delete(membership)
            await db.flush()
            if not remaining:
                await db.execute(
                    sa_delete(Group).where(Group.id == group_id)
                )
                await db.flush()
                return "deleted"
            if membership.role == MemberRole.ADMIN and not any(
                m.role == MemberRole.ADMIN for m in remaining
            ):
                oldest = sorted(remaining, key=lambda m: str(m.user_id))[0]
                oldest.role = MemberRole.ADMIN
                await db.flush()
        return "left"

    @staticmethod
    async def archive(
        db: AsyncSession,
        user_id: UUID,
        group_id: UUID,
    ) -> Group:
        """Archive a group (admins only; idempotent)."""
        membership = await GroupService.require_membership(
            db, user_id, group_id
        )
        if membership.role != MemberRole.ADMIN:
            raise GroupPermissionError(
                "Only a group admin can archive the group."
            )
        group = await db.get(Group, group_id)
        if group is None:  # pragma: no cover - membership implies group
            raise GroupNotFoundError("Group not found.")
        async with transaction(db):
            group.lifecycle = GroupLifecycle.ARCHIVED
            await db.flush()
        return group

    @staticmethod
    async def rotate_invite_code(
        db: AsyncSession,
        user_id: UUID,
        group_id: UUID,
    ) -> Group:
        """Generate a fresh invite code (admins only)."""
        membership = await GroupService.require_membership(
            db, user_id, group_id
        )
        if membership.role != MemberRole.ADMIN:
            raise GroupPermissionError(
                "Only a group admin can regenerate the invite link."
            )
        group = await db.get(Group, group_id)
        if group is None:  # pragma: no cover - membership implies group
            raise GroupNotFoundError("Group not found.")
        async with transaction(db):
            group.invite_code = _generate_invite_code()
            await db.flush()
        return group

    # ============================================================
    # COUNTS (profile dashboard)
    # ============================================================

    @staticmethod
    async def count_my_groups(
        db: AsyncSession,
        user_id: UUID,
    ) -> int:
        return int(
            await db.scalar(
                select(func.count())
                .select_from(GroupMember)
                .where(GroupMember.user_id == user_id)
            )
            or 0
        )

    @staticmethod
    async def count_my_trips(
        db: AsyncSession,
        user_id: UUID,
    ) -> int:
        return int(
            await db.scalar(
                select(func.count())
                .select_from(Group)
                .join(GroupMember, GroupMember.group_id == Group.id)
                .where(
                    GroupMember.user_id == user_id,
                    Group.group_type == GroupType.TRIP,
                )
            )
            or 0
        )
