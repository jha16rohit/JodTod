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
from backend.models.user import User
from backend.services.activity_events import (
    display_name_of,
    emit_member_joined,
)
from backend.services.group_service import GroupService
from backend.services.notification_service import NotificationService


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
        new_member = await db.get(User, user_id)
        await emit_member_joined(
            db,
            member_ids=sorted(
                await GroupService.member_user_ids(db, group.id),
                key=str,
            ),
            group_name=group.name,
            new_member_name=display_name_of(new_member, "A new member"),
        )

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

    @staticmethod
    async def create_invitation(
        db: AsyncSession,
        *,
        invitee_user_id: UUID,
        group_name: str,
        invite_code: str,
        invited_by: str | None = None,
    ) -> GroupInvitation:
        """
        Create a group invitation and send a notification to the invitee.

        Idempotent: if a pending invitation already exists for the same
        (invitee_user_id, invite_code), return the existing one.
        """
        existing = await db.scalar(
            select(GroupInvitation).where(
                GroupInvitation.user_id == invitee_user_id,
                GroupInvitation.invite_code == invite_code,
                GroupInvitation.status == PENDING_STATUS,
            )
        )
        if existing is not None:
            return existing

        async with transaction(db):
            invitation = GroupInvitation(
                user_id=invitee_user_id,
                group_name=group_name,
                invite_code=invite_code,
                invited_by=invited_by,
                status=PENDING_STATUS,
            )
            db.add(invitation)
            await db.flush()

        # Send notification to invitee
        await NotificationService.wire_group_invitation(
            db=db,
            user_id=invitee_user_id,
            group_id=None,  # Group might not exist yet in backend
            group_name=group_name,
            inviter_name=invited_by,
            context_data={
                "invitation_id": str(invitation.id),
                "group_name": group_name,
                "invite_code": invite_code,
                "invited_by": invited_by,
            },
        )

        return invitation
