# backend/services/expense_service.py

"""
Expense recording for groups.

An expense states that one member paid `amount` for the group; splits
assign each participant's share. Equal splits distribute leftover
pennies deterministically (first participants, member-id order) so the
shares always sum to exactly the amount. Custom splits must sum to the
amount exactly (Decimal comparison, no float tolerance games).
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import transaction
from backend.models.expense import Expense, ExpenseSplit
from backend.models.group import Group
from backend.models.user import User
from backend.services.balance_service import CENT, ZERO, money, parse_money, quantize
from backend.services.group_service import (
    GroupNotFoundError,
    GroupService,
    GroupValidationError,
)
from backend.services.notification_service import NotificationService
from sqlalchemy import select


class ExpenseValidationError(Exception):
    """Bad expense input (mapped to 422)."""


MAX_EXPENSE_AMOUNT = Decimal("10000000.00")


class ExpenseService:
    """Create/list group expenses for the authenticated user."""

    @staticmethod
    def _equal_shares(
        amount: Decimal, participant_ids: list[UUID]
    ) -> dict[UUID, Decimal]:
        count = len(participant_ids)
        base = (amount / count).quantize(CENT)
        shares = {pid: base for pid in participant_ids}
        remainder = quantize(amount - base * count)
        pennies = int((remainder / CENT).to_integral_value())
        for pid in sorted(participant_ids, key=str)[:pennies]:
            shares[pid] = quantize(shares[pid] + CENT)
        return shares

    @staticmethod
    async def create_expense(
        db: AsyncSession,
        creator_id: UUID,
        group_id: UUID,
        title: str,
        amount: object,
        payer_user_id: UUID | None = None,
        split_type: str = "equal",
        participant_ids: list[UUID] | None = None,
        splits: list[dict] | None = None,
        description: str | None = None,
    ) -> Expense:
        group = await GroupService.get_group_for_user(
            db, creator_id, group_id
        )
        if group is None:
            raise GroupNotFoundError("Group not found.")

        clean_title = (title or "").strip()
        if not clean_title or len(clean_title) > 120:
            raise ExpenseValidationError(
                "Expense title is required (max 120 characters)."
            )
        try:
            total = parse_money(amount)
        except (ValueError, ArithmeticError) as exc:
            raise ExpenseValidationError(
                "Amount must be a positive decimal string."
            ) from exc
        if total <= ZERO or total > MAX_EXPENSE_AMOUNT:
            raise ExpenseValidationError(
                "Amount must be greater than 0."
            )

        members = await GroupService.member_user_ids(db, group_id)
        payer = payer_user_id or creator_id
        if payer not in members:
            raise ExpenseValidationError(
                "Payer must be a member of the group."
            )
        if description is not None and len(description) > 500:
            raise ExpenseValidationError(
                "Description must be at most 500 characters."
            )

        if split_type not in ("equal", "custom"):
            raise ExpenseValidationError(
                "split_type must be 'equal' or 'custom'."
            )

        share_map: dict[UUID, Decimal]
        if split_type == "equal":
            participants = participant_ids or sorted(
                members, key=str
            )
            participants = list(dict.fromkeys(participants))
            if not participants:
                raise ExpenseValidationError(
                    "At least one participant is required."
                )
            unknown = [p for p in participants if p not in members]
            if unknown:
                raise ExpenseValidationError(
                    "All participants must be group members."
                )
            share_map = ExpenseService._equal_shares(total, participants)
        else:
            if not splits:
                raise ExpenseValidationError(
                    "Custom splits require a splits list."
                )
            share_map = {}
            for entry in splits:
                try:
                    uid = UUID(str(entry.get("user_id")))
                    share = parse_money(entry.get("share_amount"))
                except (ValueError, ArithmeticError, AttributeError) as exc:
                    raise ExpenseValidationError(
                        "Each split needs user_id and share_amount."
                    ) from exc
                if uid not in members:
                    raise ExpenseValidationError(
                        "All split users must be group members."
                    )
                if share < ZERO:
                    raise ExpenseValidationError(
                        "Split shares cannot be negative."
                    )
                share_map[uid] = share
            if quantize(sum(share_map.values(), ZERO)) != total:
                raise ExpenseValidationError(
                    "Custom split shares must sum to the expense amount."
                )

        async with transaction(db):
            expense = Expense(
                group_id=group_id,
                title=clean_title,
                description=(description or "").strip() or None,
                amount=total,
                currency=group.currency,
                payer_user_id=payer,
                created_by=creator_id,
            )
            db.add(expense)
            await db.flush()
            for user_id, share in share_map.items():
                db.add(
                    ExpenseSplit(
                        expense_id=expense.id,
                        user_id=user_id,
                        share_amount=share,
                    )
                )
            await db.flush()

        # Create notifications for all group members except the payer
        # Get member details for notification context
        member_users = {}
        if members:
            member_rows = list(
                (
                    await db.execute(select(User).where(User.id.in_(members)))
                ).scalars().all()
            )
            member_users = {u.id: u for u in member_rows}

        payer_user = member_users.get(payer)
        payer_name = payer_user.name if payer_user and payer_user.name else "Someone"

        # Notify all members except the payer
        for member_id in members:
            if member_id == payer:
                continue
            member = member_users.get(member_id)
            member_name = member.name if member and member.name else "Member"
            await NotificationService.wire_expense_added(
                db=db,
                user_id=member_id,
                group_id=group_id,
                expense_title=clean_title,
                expense_amount=money(total),
                expense_category=None,  # Category not in expense model yet
                expense_payer=payer_name,
                expense_note=description,
                bill_image_ref=None,  # Bill image not in expense model yet
                context_data={
                    "expense_id": str(expense.id),
                    "expense_title": clean_title,
                    "amount": money(total),
                    "currency": group.currency,
                    "paid_by": payer_name,
                    "group_name": group.name,
                    "split_type": split_type,
                    "shared_with": ", ".join(
                        [
                            member_users[pid].name
                            for pid in share_map.keys()
                            if pid in member_users and member_users[pid].name
                        ]
                    ) or "Group members",
                    "note": description,
                },
            )

        return expense

    @staticmethod
    async def list_expenses(
        db: AsyncSession,
        user_id: UUID,
        group_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Expense], int]:
        group = await GroupService.get_group_for_user(
            db, user_id, group_id
        )
        if group is None:
            raise GroupNotFoundError("Group not found.")
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        total = int(
            await db.scalar(
                select(func.count())
                .select_from(Expense)
                .where(Expense.group_id == group_id)
            )
            or 0
        )
        rows = list(
            (
                await db.execute(
                    select(Expense)
                    .where(Expense.group_id == group_id)
                    .order_by(Expense.expense_date.desc(), Expense.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        return rows, total

    @staticmethod
    async def count_my_group_expenses(
        db: AsyncSession,
        user_id: UUID,
    ) -> int:
        """Expenses in groups the user belongs to (profile dashboard)."""
        group_ids = await GroupService.my_group_ids(db, user_id)
        if not group_ids:
            return 0
        return int(
            await db.scalar(
                select(func.count())
                .select_from(Expense)
                .where(Expense.group_id.in_(group_ids))
            )
            or 0
        )
