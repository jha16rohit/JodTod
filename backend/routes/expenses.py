"""
JodTod expense routes for the authenticated user.

Identity always comes from the Bearer session. Expenses can only be
recorded in groups the user belongs to; payer and split users must be
members. Money arrives as decimal strings and is persisted as Numeric.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.expense import ExpenseSplit
from backend.models.user import User
from backend.schemas.expenses import (
    CreateExpenseRequest,
    ExpenseListResponse,
    ExpenseResponse,
    SplitResponse,
)
from backend.services.balance_service import money
from backend.services.expense_service import (
    ExpenseService,
    ExpenseValidationError,
)
from backend.services.group_service import (
    GroupNotFoundError,
    GroupValidationError,
)
from backend.services.settlement_service import SettlementService

router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"],
)


async def _present(
    db: AsyncSession, expense, with_splits: bool = True
) -> ExpenseResponse:
    payer = await db.get(User, expense.payer_user_id)
    splits: list[SplitResponse] = []
    if with_splits:
        rows = list(
            (
                await db.execute(
                    select(ExpenseSplit).where(
                        ExpenseSplit.expense_id == expense.id
                    )
                )
            )
            .scalars()
            .all()
        )
        users = (
            {
                u.id: u
                for u in (
                    await db.execute(
                        select(User).where(
                            User.id.in_({r.user_id for r in rows})
                        )
                    )
                )
                .scalars()
                .all()
            }
            if rows
            else {}
        )
        splits = [
            SplitResponse(
                user_id=row.user_id,
                display_name=(
                    SettlementService.display_name(users[row.user_id])
                    if row.user_id in users
                    else "Member"
                ),
                share_amount=money(row.share_amount),
            )
            for row in rows
        ]
    return ExpenseResponse(
        id=expense.id,
        group_id=expense.group_id,
        title=expense.title,
        description=expense.description,
        amount=money(expense.amount),
        currency=expense.currency,
        payer_user_id=expense.payer_user_id,
        payer_name=(
            SettlementService.display_name(payer)
            if payer is not None
            else "Member"
        ),
        expense_date=expense.expense_date,
        created_at=expense.created_at,
        splits=splits,
    )


@router.post("", response_model=ExpenseResponse)
async def create_expense(
    payload: CreateExpenseRequest,
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
) -> ExpenseResponse:
    """Record a group expense with equal or custom splits."""
    try:
        expense = await ExpenseService.create_expense(
            db,
            creator_id=identity.id,
            group_id=payload.group_id,
            title=payload.title,
            amount=payload.amount,
            payer_user_id=payload.payer_user_id,
            split_type=payload.split_type,
            participant_ids=payload.participant_ids,
            splits=[s.model_dump() for s in payload.splits],
            description=payload.description,
        )
    except GroupNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except (ExpenseValidationError, GroupValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return await _present(db, expense)


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    group_id: Annotated[UUID, Query()],
    identity: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db, use_cache=False),
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ExpenseListResponse:
    """Paginated expenses of one group (membership-scoped)."""
    try:
        rows, total = await ExpenseService.list_expenses(
            db, identity.id, group_id, limit=limit, offset=offset
        )
    except GroupNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return ExpenseListResponse(
        expenses=[await _present(db, row) for row in rows],
        total=total,
    )
