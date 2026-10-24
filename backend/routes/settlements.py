"""
JodTod settlement routes for the authenticated user.

Identity always comes from the Bearer session. Only the debtor
initiates, only the receiver confirms/rejects, only the payer cancels.
Every read is scoped to shared groups; strangers read as 404.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.group import Group
from backend.models.settlement import Settlement
from backend.models.user import User
from backend.schemas.settlements import (
    InitiateSettlementRequest,
    PendingConfirmationResponse,
    PeopleListResponse,
    PersonDetailResponse,
    PersonGroupResponse,
    PersonSummaryResponse,
    RejectSettlementRequest,
    SettlementHistoryResponse,
    SettlementResponse,
)
from backend.services.balance_service import money
from backend.services.settlement_service import (
    SettlementNotFoundError,
    SettlementPermissionError,
    SettlementService,
    SettlementStateError,
    SettlementValidationError,
)

router = APIRouter(
    prefix="/settlements",
    tags=["Settlements"],
)


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=str(exc) or "Settlement not found.",
    )


def _forbidden(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=str(exc),
    )


def _conflict(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=str(exc),
    )


def _unprocessable(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=str(exc),
    )


async def _present_many(
    db: AsyncSession, rows: list[Settlement]
) -> list[SettlementResponse]:
    if not rows:
        return []
    groups = {
        g.id: g
        for g in (
            await db.execute(
                select(Group).where(
                    Group.id.in_({r.group_id for r in rows})
                )
            )
        )
        .scalars()
        .all()
    }
    user_ids = {r.payer_user_id for r in rows} | {
        r.receiver_user_id for r in rows
    }
    users = {
        u.id: u
        for u in (
            await db.execute(select(User).where(User.id.in_(user_ids)))
        )
        .scalars()
        .all()
    }
    out: list[SettlementResponse] = []
    for row in rows:
        group = groups.get(row.group_id)
        payer = users.get(row.payer_user_id)
        receiver = users.get(row.receiver_user_id)
        out.append(
            SettlementResponse(
                id=row.id,
                group_id=row.group_id,
                group_name=group.name if group is not None else "",
                payer_user_id=row.payer_user_id,
                payer_name=(
                    SettlementService.display_name(payer)
                    if payer is not None
                    else "Member"
                ),
                receiver_user_id=row.receiver_user_id,
                receiver_name=(
                    SettlementService.display_name(receiver)
                    if receiver is not None
                    else "Member"
                ),
                amount=money(row.amount),
                currency=row.currency,
                status=row.status.value,
                payment_method=row.payment_method.value,
                note=row.note,
                rejection_reason=row.rejection_reason,
                initiated_at=row.initiated_at,
                confirmed_at=row.confirmed_at,
                created_at=row.created_at,
            )
        )
    return out


# ---------------------------------------------------------------------------
# PEOPLE
# ---------------------------------------------------------------------------


@router.get("/people", response_model=PeopleListResponse)
async def list_people(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
    q: Annotated[str | None, Query(max_length=64)] = None,
    direction: Annotated[str, Query()] = "all",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PeopleListResponse:
    """
    Active settlement relationships (summary only, no history).

    Only people sharing a group with a current non-zero balance appear.
    """
    try:
        entries, total = await SettlementService.people_summary(
            db,
            identity.id,
            search=q,
            direction=direction,
            limit=limit,
            offset=offset,
        )
    except SettlementValidationError as exc:
        raise _unprocessable(exc) from exc
    return PeopleListResponse(
        people=[
            PersonSummaryResponse(
                user_id=entry["user"].id,
                display_name=SettlementService.display_name(
                    entry["user"]
                ),
                profile_photo=entry["user"].avatar_url,
                common_group_count=entry["common_group_count"],
                you_owe=entry["you_owe"],
                they_owe=entry["they_owe"],
                net_balance=entry["net_balance"],
                direction=entry["direction"],
            )
            for entry in entries
        ],
        total=total,
    )


@router.get("/people/{person_id}", response_model=PersonDetailResponse)
async def get_person(
    person_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> PersonDetailResponse:
    """One person's current active relationship (non-zero groups only)."""
    try:
        detail = await SettlementService.person_detail(
            db, identity.id, person_id
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    except SettlementValidationError as exc:
        raise _unprocessable(exc) from exc
    person = detail["person"]
    return PersonDetailResponse(
        user_id=person.id,
        display_name=SettlementService.display_name(person),
        profile_photo=person.avatar_url,
        you_owe=detail["you_owe"],
        they_owe=detail["they_owe"],
        net_balance=detail["net_balance"],
        direction=detail["direction"],
        groups=[
            PersonGroupResponse(
                group_id=item["group"].id,
                name=item["group"].name,
                group_type=item["group"].group_type.value,
                image_url=item["group"].image_url,
                you_owe=item["you_owe"],
                they_owe=item["they_owe"],
                net_balance=item["net_balance"],
                direction=item["direction"],
            )
            for item in detail["groups"]
        ],
    )


@router.get(
    "/people/{person_id}/history",
    response_model=SettlementHistoryResponse,
)
async def person_history(
    person_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SettlementHistoryResponse:
    """Confirmed payments with one person across common groups."""
    try:
        rows, total, _ = await SettlementService.person_history(
            db, identity.id, person_id, limit=limit, offset=offset
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    except SettlementValidationError as exc:
        raise _unprocessable(exc) from exc
    return SettlementHistoryResponse(
        settlements=await _present_many(db, rows), total=total
    )


# ---------------------------------------------------------------------------
# PENDING CONFIRMATIONS (receiver inbox drives the popup)
# ---------------------------------------------------------------------------


@router.get(
    "/pending-confirmations",
    response_model=PendingConfirmationResponse,
)
async def pending_confirmations(
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PendingConfirmationResponse:
    """PENDING payments where the user is the receiver (newest first)."""
    rows, _, _ = await SettlementService.pending_for_receiver(
        db, identity.id, limit=limit, offset=offset
    )
    return PendingConfirmationResponse(
        pending=await _present_many(db, rows)
    )


# ---------------------------------------------------------------------------
# GROUP HISTORY
# ---------------------------------------------------------------------------


@router.get(
    "/groups/{group_id}/history",
    response_model=SettlementHistoryResponse,
)
async def group_history(
    group_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SettlementHistoryResponse:
    """Confirmed payments of one group (paginated, newest first)."""
    try:
        rows, total, _ = await SettlementService.group_history(
            db, identity.id, group_id, limit=limit, offset=offset
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    return SettlementHistoryResponse(
        settlements=await _present_many(db, rows), total=total
    )


# ---------------------------------------------------------------------------
# INITIATE / READ / CONFIRM / REJECT / CANCEL
# ---------------------------------------------------------------------------


@router.post("", response_model=SettlementResponse)
async def initiate_settlement(
    payload: InitiateSettlementRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> SettlementResponse:
    """
    Claim a payment (payer only). Creates PENDING; the debt stays fully
    active until the receiver confirms.
    """
    try:
        row = await SettlementService.initiate(
            db,
            payer_id=identity.id,
            group_id=payload.group_id,
            receiver_id=payload.receiver_user_id,
            amount=payload.amount,
            payment_method=payload.payment_method,
            note=payload.note,
            idempotency_key=payload.idempotency_key,
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    except SettlementStateError as exc:
        raise _conflict(exc) from exc
    except SettlementValidationError as exc:
        raise _unprocessable(exc) from exc
    return (await _present_many(db, [row]))[0]


@router.get("/{settlement_id}", response_model=SettlementResponse)
async def get_settlement(
    settlement_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> SettlementResponse:
    """One settlement visible via shared-group membership."""
    try:
        row = await SettlementService.get_for_user(
            db, identity.id, settlement_id
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    return (await _present_many(db, [row]))[0]


@router.post("/{settlement_id}/confirm", response_model=SettlementResponse)
async def confirm_settlement(
    settlement_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> SettlementResponse:
    """
    Receiver confirms receipt: PENDING -> PAID exactly once, under row
    lock. Only now does the balance drop.
    """
    try:
        row = await SettlementService.confirm(
            db, identity.id, settlement_id
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    except SettlementPermissionError as exc:
        raise _forbidden(exc) from exc
    except SettlementStateError as exc:
        raise _conflict(exc) from exc
    return (await _present_many(db, [row]))[0]


@router.post("/{settlement_id}/reject", response_model=SettlementResponse)
async def reject_settlement(
    settlement_id: UUID,
    payload: RejectSettlementRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> SettlementResponse:
    """Receiver denies receipt: PENDING -> REJECTED, debt unchanged."""
    try:
        row = await SettlementService.reject(
            db, identity.id, settlement_id, reason=payload.reason
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    except SettlementPermissionError as exc:
        raise _forbidden(exc) from exc
    except SettlementStateError as exc:
        raise _conflict(exc) from exc
    except SettlementValidationError as exc:
        raise _unprocessable(exc) from exc
    return (await _present_many(db, [row]))[0]


@router.post("/{settlement_id}/cancel", response_model=SettlementResponse)
async def cancel_settlement(
    settlement_id: UUID,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> SettlementResponse:
    """Payer withdraws an unconfirmed claim: PENDING -> CANCELLED."""
    try:
        row = await SettlementService.cancel(
            db, identity.id, settlement_id
        )
    except SettlementNotFoundError as exc:
        raise _not_found(exc) from exc
    except SettlementPermissionError as exc:
        raise _forbidden(exc) from exc
    except SettlementStateError as exc:
        raise _conflict(exc) from exc
    return (await _present_many(db, [row]))[0]
