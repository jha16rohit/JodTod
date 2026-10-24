# backend/services/group_invitation_service.py

"""
Incoming group invitations for the authenticated user.

Every query is scoped to the invitee user_id — User A can only see
and resolve invitations addressed to User A. Only pending rows are
listed; accept/decline transition a pending row exactly once (repeat
calls return the already-resolved row instead of duplicating work).
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import transaction
from backend.models.group import GroupMember
from backend.models.group_invitation import GroupInvitation


PENDING_STATUS = "pending"
ACCEPTED_STATUS = "accepted"
DECLINED_STATUS = "declined"


class InvitationNotFoundError(Exception):
    """No such pending invitation for this user (mapped to 404)."""


class GroupInvitationService:
    """List + resolve the authenticated user's pending invitations."""

    @staticmethod
    async def list_pending(
        db: AsyncSession,
        user_id: UUID,
    ) -> list[GroupInvitation]:
        result = await db.execute(
            select(GroupInvitation)
            .where(
                GroupInvitation.user_id == user_id,
                GroupInvitation.status == PENDING_STATUS,
            )
            .order_by(GroupInvitation.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def _resolve(
        db: AsyncSession,
        user_id: UUID,
        invitation_id: UUID,
        status: str,
    ) -> GroupInvitation:
        invitation = await db.scalar(
            select(GroupInvitation).where(
                GroupInvitation.id == invitation_id,
                GroupInvitation.user_id == user_id,
            )
        )
        if invitation is None:
            raise InvitationNotFoundError(
                "Invitation not found."
            )
        if invitation.status != PENDING_STATUS:
            # Already handled (accepted/declined/expired/revoked):
            # never surface as pending again, never duplicate.
            raise InvitationNotFoundError(
                "Invitation is no longer pending."
            )
        async with transaction(db):
            invitation.status = status
            await db.flush()
        return invitation

    @staticmethod
    async def accept(
        db: AsyncSession,
        user_id: UUID,
        invitation_id: UUID,
    ) -> GroupInvitation:
        """
        Accept a pending invitation.

        Marks the row accepted so it leaves the pending list. When the
        invite code resolves to a real group, the invitee also gains
        membership there (idempotent); legacy snapshot-only invites
        (no matching group) keep the previous mark-only behavior.
        """
        invitation = await GroupInvitationService._resolve(
            db, user_id, invitation_id, ACCEPTED_STATUS
        )
        await GroupInvitationService._attach_membership(
            db, user_id, invitation.invite_code
        )
        return invitation

    @staticmethod
    async def _attach_membership(
        db: AsyncSession,
        user_id: UUID,
        invite_code: str,
    ) -> None:
        """Best-effort membership attach on invite-code match."""
        from backend.models.group import Group, MemberRole

        group = await db.scalar(
            select(Group).where(
                Group.invite_code == (invite_code or "").strip().upper()
            )
        )
        if group is None:
            return
        existing = await db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.user_id == user_id,
            )
        )
        if existing is not None:
            return
        async with transaction(db):
            db.add(
                GroupMember(
                    group_id=group.id,
                    user_id=user_id,
                    role=MemberRole.MEMBER,
                )
            )
            await db.flush()

    @staticmethod
    async def decline(
        db: AsyncSession,
        user_id: UUID,
        invitation_id: UUID,
    ) -> GroupInvitation:
        """Decline a pending invitation (leaves the pending list)."""
        return await GroupInvitationService._resolve(
            db, user_id, invitation_id, DECLINED_STATUS
        )
