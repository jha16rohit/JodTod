# backend/services/balance_service.py

"""
Authoritative settlement math for JodTod.

All money is Decimal quantized to 2 places; float never participates.

Core identity (per group):

    gross obligation (expense splits)
    minus confirmed (PAID) settlement payments
    = current remaining obligation

PENDING payments never reduce a balance — the debt stays fully active
until the receiver confirms. A zero balance means "no active
settlement", never a settlement record of its own.

Two consistent views derive from the same ledger:
- member nets: paid - share + confirmed_in_as_payer - confirmed_in_as_receiver
  (positive = the group owes the member)
- pairwise debt U->P: U's shares in P-paid expenses, minus P's shares
  in U-paid expenses, minus confirmed U->P, plus confirmed P->U.
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.expense import Expense, ExpenseSplit
from backend.models.settlement import (
    CONFIRMED_STATUSES,
    Settlement,
    SettlementStatus,
)


CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def quantize(value: Decimal) -> Decimal:
    """Round money to 2 decimal places (banker's downstream safe)."""
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def money(value: Decimal) -> str:
    """Serialize money for the API: always a 2dp string, never float."""
    return format(quantize(value), ".2f")


def parse_money(raw: object) -> Decimal:
    """Parse client-supplied money strictly into Decimal."""
    if isinstance(raw, Decimal):
        return quantize(raw)
    if isinstance(raw, int):
        return quantize(Decimal(raw))
    if isinstance(raw, str):
        text = raw.strip().replace(",", "")
        if not text:
            raise ValueError("Amount is required.")
        return quantize(Decimal(text))
    raise ValueError("Amount must be a decimal string.")


class GroupLedger:
    """Everything needed to derive every balance of one group."""

    __slots__ = ("expenses", "splits", "paid_settlements")

    def __init__(
        self,
        expenses: list[Expense] | None = None,
        splits: list[ExpenseSplit] | None = None,
        paid_settlements: list[Settlement] | None = None,
    ) -> None:
        self.expenses = expenses or []
        self.splits = splits or []
        self.paid_settlements = paid_settlements or []


async def load_ledger(
    db: AsyncSession,
    group_id: UUID,
) -> GroupLedger:
    """Load one group's full ledger in 3 queries (no N+1)."""
    expenses = list(
        (
            await db.execute(
                select(Expense).where(Expense.group_id == group_id)
            )
        )
        .scalars()
        .all()
    )
    splits: list[ExpenseSplit] = []
    if expenses:
        expense_ids = [e.id for e in expenses]
        splits = list(
            (
                await db.execute(
                    select(ExpenseSplit).where(
                        ExpenseSplit.expense_id.in_(expense_ids)
                    )
                )
            )
            .scalars()
            .all()
        )
    paid = list(
        (
            await db.execute(
                select(Settlement).where(
                    Settlement.group_id == group_id,
                    Settlement.status.in_(CONFIRMED_STATUSES),
                )
            )
        )
        .scalars()
        .all()
    )
    return GroupLedger(expenses, splits, paid)


async def load_ledgers(
    db: AsyncSession,
    group_ids: list[UUID],
) -> dict[UUID, GroupLedger]:
    """Load many groups' ledgers in 3 queries total (no N+1)."""
    ledgers: dict[UUID, GroupLedger] = {g: GroupLedger() for g in group_ids}
    if not group_ids:
        return ledgers
    expenses = list(
        (
            await db.execute(
                select(Expense).where(Expense.group_id.in_(group_ids))
            )
        )
        .scalars()
        .all()
    )
    by_group: dict[UUID, list[Expense]] = defaultdict(list)
    for expense in expenses:
        by_group[expense.group_id].append(expense)
    splits_by_group: dict[UUID, list[ExpenseSplit]] = defaultdict(list)
    if expenses:
        expense_group = {e.id: e.group_id for e in expenses}
        splits = list(
            (
                await db.execute(
                    select(ExpenseSplit).where(
                        ExpenseSplit.expense_id.in_(list(expense_group))
                    )
                )
            )
            .scalars()
            .all()
        )
        for split in splits:
            splits_by_group[expense_group[split.expense_id]].append(split)
    paid_by_group: dict[UUID, list[Settlement]] = defaultdict(list)
    paid = list(
        (
            await db.execute(
                select(Settlement).where(
                    Settlement.group_id.in_(group_ids),
                    Settlement.status.in_(CONFIRMED_STATUSES),
                )
            )
        )
        .scalars()
        .all()
    )
    for row in paid:
        paid_by_group[row.group_id].append(row)
    for group_id in group_ids:
        ledgers[group_id] = GroupLedger(
            by_group.get(group_id, []),
            splits_by_group.get(group_id, []),
            paid_by_group.get(group_id, []),
        )
    return ledgers


def member_nets(
    ledger: GroupLedger,
    member_ids: list[UUID],
) -> dict[UUID, Decimal]:
    """
    Net balance per member: positive = group owes them (creditor),
    negative = they owe the group (debtor). Always sums to zero.
    """
    nets: dict[UUID, Decimal] = {m: ZERO for m in member_ids}
    for expense in ledger.expenses:
        amount = quantize(Decimal(expense.amount))
        if expense.payer_user_id in nets:
            nets[expense.payer_user_id] += amount
    for split in ledger.splits:
        if split.user_id in nets:
            nets[split.user_id] -= quantize(Decimal(split.share_amount))
    for row in ledger.paid_settlements:
        amount = quantize(Decimal(row.amount))
        if row.payer_user_id in nets:
            nets[row.payer_user_id] += amount
        if row.receiver_user_id in nets:
            nets[row.receiver_user_id] -= amount
    return {m: quantize(v) for m, v in nets.items()}


def pairwise_net(
    ledger: GroupLedger,
    user_id: UUID,
    person_id: UUID,
) -> Decimal:
    """
    Amount `user_id` currently owes `person_id` in this group.

    Positive = user owes person; negative = person owes user.
    Only PAID settlements move the number; PENDING claims do not.
    """
    payer_of = {e.id: e.payer_user_id for e in ledger.expenses}
    gross_user_owes = ZERO
    gross_person_owes = ZERO
    for split in ledger.splits:
        share = quantize(Decimal(split.share_amount))
        payer = payer_of.get(split.expense_id)
        if payer is None:
            continue
        if split.user_id == user_id and payer == person_id:
            gross_user_owes += share
        elif split.user_id == person_id and payer == user_id:
            gross_person_owes += share
    paid_user_to_person = ZERO
    paid_person_to_user = ZERO
    for row in ledger.paid_settlements:
        amount = quantize(Decimal(row.amount))
        if (
            row.payer_user_id == user_id
            and row.receiver_user_id == person_id
        ):
            paid_user_to_person += amount
        elif (
            row.payer_user_id == person_id
            and row.receiver_user_id == user_id
        ):
            paid_person_to_user += amount
    return quantize(
        gross_user_owes
        - gross_person_owes
        - paid_user_to_person
        + paid_person_to_user
    )


def is_settled(nets: dict[UUID, Decimal]) -> bool:
    """A group is settled only when every member net is exactly zero."""
    return all(v == ZERO for v in nets.values())


def suggest_payments(
    nets: dict[UUID, Decimal],
) -> list[tuple[UUID, UUID, Decimal]]:
    """
    Minimum-transaction settlement plan (greedy debtor/creditor match).

    Returns (payer, receiver, amount) tuples. Debtors pay creditors
    largest-first, which yields the minimum practical number of
    transfers for settling all nets to zero.
    """
    debtors = sorted(
        ((u, -n) for u, n in nets.items() if n < ZERO),
        key=lambda item: item[1],
        reverse=True,
    )
    creditors = sorted(
        ((u, n) for u, n in nets.items() if n > ZERO),
        key=lambda item: item[1],
        reverse=True,
    )
    plan: list[tuple[UUID, UUID, Decimal]] = []
    i = j = 0
    debts = [(u, a) for u, a in debtors]
    credits = [(u, a) for u, a in creditors]
    while i < len(debts) and j < len(credits):
        debtor, owed = debts[i]
        creditor, due = credits[j]
        amount = quantize(min(owed, due))
        if amount <= ZERO:
            break
        plan.append((debtor, creditor, amount))
        owed = quantize(owed - amount)
        due = quantize(due - amount)
        if owed == ZERO:
            i += 1
        else:
            debts[i] = (debtor, owed)
        if due == ZERO:
            j += 1
        else:
            credits[j] = (creditor, due)
    return plan


def direction_for(net: Decimal) -> str:
    """
    Pairwise net direction from the authenticated user's view.

    `net` is what the user owes the person: positive = YOU_OWE,
    negative = THEY_OWE, zero = SETTLED (never listed as active).
    """
    if net > ZERO:
        return "YOU_OWE"
    if net < ZERO:
        return "THEY_OWE"
    return "SETTLED"


async def count_confirmed_for_group(
    db: AsyncSession,
    group_id: UUID,
) -> int:
    """Number of immutable PAID records in a group (history depth)."""
    from sqlalchemy import func

    return int(
        await db.scalar(
            select(func.count())
            .select_from(Settlement)
            .where(
                Settlement.group_id == group_id,
                Settlement.status == SettlementStatus.PAID,
            )
        )
        or 0
    )
