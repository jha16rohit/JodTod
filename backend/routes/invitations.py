"""
JodTod group-invitation routes for the authenticated user.

Identity always comes from the Bearer session. Invitation IDs are
authorization-checked server-side (id + invitee user_id); rows owned
by someone else read as 404 without revealing ownership.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User
from backend.schemas.invitations import (
    GroupInvitationListResponse,
    GroupInvitationResponse,
)
from backend.services.group_invitation_service import (
    GroupInvitationService,
    InvitationNotFoundError,
)

router = APIRouter(
    prefix="/invitations",
    tags=["Invitations"],
)


@router.get(
    "/mine",
    response_model=GroupInvitationListResponse,
)
async def list_my_invitations(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> GroupInvitationListResponse:
    """Pending invitations addressed to the authenticated user."""
    rows = await GroupInvitationService.list_pending(db, identity.id)
    return GroupInvitationListResponse(
        invitations=[GroupInvitationResponse.model_validate(r) for r in rows]
    )


@router.post(
    "/{invitation_id}/accept",
    response_model=GroupInvitationResponse,
)
async def accept_invitation(
    invitation_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> GroupInvitationResponse:
    """Accept a pending invitation (leaves the pending list)."""
    try:
        row = await GroupInvitationService.accept(
            db, identity.id, invitation_id
        )
    except InvitationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    await db.refresh(row)
    return GroupInvitationResponse.model_validate(row)


@router.post(
    "/{invitation_id}/decline",
    response_model=GroupInvitationResponse,
)
async def decline_invitation(
    invitation_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> GroupInvitationResponse:
    """Decline a pending invitation (leaves the pending list)."""
    try:
        row = await GroupInvitationService.decline(
            db, identity.id, invitation_id
        )
    except InvitationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    await db.refresh(row)
    return GroupInvitationResponse.model_validate(row)
