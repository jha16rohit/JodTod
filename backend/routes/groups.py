"""
JodTod group routes for the authenticated user.

Identity always comes from the Bearer session. Every read and mutation
is membership-scoped: groups the user does not belong to read as 404.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.group import GroupLifecycle, GroupMember
from backend.models.user import User
from backend.schemas.groups import (
    AddMemberRequest,
    ArchiveGroupResponse,
    CreateGroupRequest,
    GroupDetailResponse,
    GroupListResponse,
    GroupMemberResponse,
    GroupSummaryResponse,
    InviteCodeResponse,
    JoinGroupRequest,
    LeaveGroupResponse,
    SuggestionListResponse,
    SuggestionResponse,
)
from backend.services.balance_service import (
    ZERO,
    is_settled,
    load_ledgers,
    member_nets,
    money,
    quantize,
    suggest_payments,
)
from backend.services.group_service import (
    GroupNotFoundError,
    GroupPermissionError,
    GroupService,
    GroupValidationError,
)
from backend.services.settlement_service import (
    SettlementNotFoundError,
    SettlementService,
)

router = APIRouter(
    prefix="/groups",
    tags=["Groups"],
)


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=str(exc) or "Group not found.",
    )


@router.post("", response_model=GroupSummaryResponse)
async def create_group(
    payload: CreateGroupRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> GroupSummaryResponse:
    """Create a group; the creator becomes its admin member."""
    try:
        group = await GroupService.create_group(
            db,
            creator_id=identity.id,
            name=payload.name,
            description=payload.description,
            group_type=payload.group_type,
            currency=payload.currency,
            member_user_ids=payload.member_user_ids,
            image_url=payload.image_url,
        )
    except GroupValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return GroupSummaryResponse(
        id=group.id,
        name=group.name,
        group_type=group.group_type.value,
        currency=group.currency,
        image_url=group.image_url,
        lifecycle=group.lifecycle.value,
        settlement_status="pending",
        member_count=len({identity.id, *(payload.member_user_ids or [])}),
        invite_code=group.invite_code,
    )


@router.get("", response_model=GroupListResponse)
async def list_groups(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> GroupListResponse:
    """
    My groups with live balances (Settle list).

    Balances derive from expenses minus confirmed settlements in bulk
    (3 ledger queries for all groups, no N+1, no history payload).
    """
    groups = await GroupService.list_my_groups(db, identity.id)
    if not groups:
        return GroupListResponse(groups=[])
    group_ids = [g.id for g in groups]
    ledgers = await load_ledgers(db, group_ids)
    membership_rows = list(
        (
            await db.execute(
                select(GroupMember).where(
                    GroupMember.group_id.in_(group_ids)
                )
            )
        )
        .scalars()
        .all()
    )
    members_by_group: dict[UUID, list[UUID]] = {}
    for row in membership_rows:
        members_by_group.setdefault(row.group_id, []).append(row.user_id)

    summaries: list[GroupSummaryResponse] = []
    for group in groups:
        member_ids = members_by_group.get(group.id, [])
        nets = member_nets(ledgers[group.id], member_ids)
        my_net = quantize(nets.get(identity.id, ZERO))
        plan = suggest_payments(nets)
        summaries.append(
            GroupSummaryResponse(
                id=group.id,
                name=group.name,
                group_type=group.group_type.value,
                currency=group.currency,
                image_url=group.image_url,
                lifecycle=group.lifecycle.value,
                settlement_status=(
                    "settled" if is_settled(nets) else "pending"
                ),
                member_count=len(member_ids),
                you_owe=money(-my_net if my_net < ZERO else ZERO),
                you_are_owed=money(my_net if my_net > ZERO else ZERO),
                pending_count=len(plan),
                invite_code=group.invite_code,
            )
        )
    return GroupListResponse(groups=summaries)


@router.post("/join", response_model=GroupSummaryResponse)
async def join_group(
    payload: JoinGroupRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> GroupSummaryResponse:
    """Join a group via its invite code (idempotent re-join)."""
    try:
        group = await GroupService.join_by_code(
            db, identity.id, payload.invite_code
        )
    except GroupNotFoundError as exc:
        raise _not_found(exc) from exc
    count = len(await GroupService.member_user_ids(db, group.id))
    lifecycle = (
        group.lifecycle.value
        if isinstance(group.lifecycle, GroupLifecycle)
        else str(group.lifecycle)
    )
    return GroupSummaryResponse(
        id=group.id,
        name=group.name,
        group_type=group.group_type.value,
        currency=group.currency,
        image_url=group.image_url,
        lifecycle=lifecycle,
        settlement_status="pending",
        member_count=count,
        invite_code=group.invite_code,
    )


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> GroupDetailResponse:
    """Group settlement overview: balances per member + my position."""
    try:
        detail = await SettlementService.group_detail(
            db, identity.id, group_id
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    group = detail["group"]
    members = [
        GroupMemberResponse(
            user_id=entry["user"].id,
            display_name=SettlementService.display_name(entry["user"]),
            avatar_url=entry["user"].avatar_url,
            role="member",
            net_balance=entry["net_balance"],
        )
        for entry in detail["balances"]
    ]
    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        group_type=group.group_type.value,
        currency=group.currency,
        image_url=group.image_url,
        lifecycle=group.lifecycle.value,
        settlement_status=detail["settlement_status"],
        member_count=detail["member_count"],
        my_net=detail["my_net"],
        my_direction=detail["my_direction"],
        confirmed_count=detail["confirmed_count"],
        invite_code=group.invite_code,
        members=members,
    )


@router.post("/{group_id}/members", response_model=GroupMemberResponse)
async def add_member(
    group_id: UUID,
    payload: AddMemberRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> GroupMemberResponse:
    """Add a user to a group the requester belongs to."""
    try:
        row = await GroupService.add_member(
            db, identity.id, group_id, payload.user_id
        )
    except GroupNotFoundError as exc:
        raise _not_found(exc) from exc
    except GroupValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    user = await db.get(User, row.user_id)
    name = (
        SettlementService.display_name(user)
        if user is not None
        else "Member"
    )
    return GroupMemberResponse(
        user_id=row.user_id,
        display_name=name,
        avatar_url=user.avatar_url if user is not None else None,
        role=row.role.value,
    )


@router.delete(
    "/{group_id}/members/me", response_model=LeaveGroupResponse
)
async def leave_group(
    group_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> LeaveGroupResponse:
    """Leave a group (last member out removes the group)."""
    try:
        outcome = await GroupService.leave(db, identity.id, group_id)
    except GroupNotFoundError as exc:
        raise _not_found(exc) from exc
    return LeaveGroupResponse(id=group_id, status=outcome)


@router.post("/{group_id}/archive", response_model=ArchiveGroupResponse)
async def archive_group(
    group_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> ArchiveGroupResponse:
    """Archive a group (admins only)."""
    try:
        group = await GroupService.archive(db, identity.id, group_id)
    except GroupNotFoundError as exc:
        raise _not_found(exc) from exc
    except GroupPermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    return ArchiveGroupResponse(
        id=group.id, lifecycle=group.lifecycle.value
    )


@router.post(
    "/{group_id}/invite-code/rotate", response_model=InviteCodeResponse
)
async def rotate_invite_code(
    group_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> InviteCodeResponse:
    """Generate a fresh invite code (admins only)."""
    try:
        group = await GroupService.rotate_invite_code(
            db, identity.id, group_id
        )
    except GroupNotFoundError as exc:
        raise _not_found(exc) from exc
    except GroupPermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    return InviteCodeResponse(
        id=group.id, invite_code=group.invite_code
    )


@router.get(
    "/{group_id}/suggestions", response_model=SuggestionListResponse
)
async def group_suggestions(
    group_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> SuggestionListResponse:
    """Minimum-transaction settlement plan from live group balances."""
    try:
        result = await SettlementService.suggestions(
            db, identity.id, group_id
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    group = result["group"]
    return SuggestionListResponse(
        group_id=group.id,
        group_name=group.name,
        suggestions=[
            SuggestionResponse(
                payer_user_id=item["payer"].id,
                payer_name=SettlementService.display_name(item["payer"]),
                payer_avatar_url=item["payer"].avatar_url,
                receiver_user_id=item["receiver"].id,
                receiver_name=SettlementService.display_name(
                    item["receiver"]
                ),
                receiver_avatar_url=item["receiver"].avatar_url,
                amount=item["amount"],
                currency=item["currency"],
            )
            for item in result["suggestions"]
        ],
    )


@router.get("/search/by-code", response_model=GroupSummaryResponse)
async def lookup_by_code(
    code: Annotated[str, Query(min_length=1, max_length=32)],
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> GroupSummaryResponse:
    """Preview a group by invite code before joining."""
    group = await GroupService.get_by_invite_code(db, code)
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite code is invalid.",
        )
    count = len(await GroupService.member_user_ids(db, group.id))
    return GroupSummaryResponse(
        id=group.id,
        name=group.name,
        group_type=group.group_type.value,
        currency=group.currency,
        image_url=group.image_url,
        lifecycle=group.lifecycle.value,
        settlement_status="pending",
        member_count=count,
        invite_code=None,
    )
