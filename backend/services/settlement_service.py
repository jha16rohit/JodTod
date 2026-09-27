# backend/services/settlement_service.py

"""
Settlement workflow for the authenticated user.

Money movement rules (enforced here, never trusted from the client):

- Only the debtor (payer) initiates; only the receiver confirms.
- Initiation creates PENDING and changes NO balance.
- Confirmation flips PENDING -> PAID under row lock, exactly once,
  and only then does the confirmed amount reduce the debt.
- PENDING -> REJECTED (receiver) / CANCELLED (payer) leave debt intact.
- PAID rows are immutable: any transition attempt is a 409.
- Amounts never exceed the backend-computed outstanding debt
  (no overpayment): the frontend never dictates what is owed.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import transaction
from backend.models.group import Group, GroupMember
from backend.models.settlement import (
    PaymentMethod,
    Settlement,
    SettlementStatus,
)
from backend.models.user import User
from backend.services.balance_service import (
    ZERO,
    direction_for,
    load_ledger,
    load_ledgers,
    member_nets,
    money,
    pairwise_net,
    parse_money,
    quantize,
    suggest_payments,
)
from backend.services.activity_events import (
    display_name_of,
    emit_settlement,
)
from backend.services.group_service import (
    GroupNotFoundError,
    GroupService,
)
from backend.services.notification_service import NotificationService


class SettlementNotFoundError(Exception):
    """No such settlement visible to this user (mapped to 404)."""


class SettlementPermissionError(Exception):
    """Wrong side of the payment tried to act (mapped to 403)."""


class SettlementStateError(Exception):
    """Illegal transition / duplicate / nothing owed (mapped to 409)."""


class SettlementValidationError(Exception):
    """Bad settlement input (mapped to 422)."""


VALID_PAYMENT_METHODS = {item.value for item in PaymentMethod}
MAX_NOTE_LENGTH = 200


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _display_name(user: User) -> str:
    if user.name and user.name.strip():
        return user.name.strip()
    if user.username and user.username.strip():
        return user.username.strip()
    if user.email:
        return user.email.split("@")[0]
    return "Member"


class SettlementService:
    """Initiate/confirm/reject/cancel + balances + history."""

    # ============================================================
    # OUTSTANDING DEBT (backend-computed, never client-supplied)
    # ============================================================

    @staticmethod
    async def outstanding(
        db: AsyncSession,
        group_id: UUID,
        payer_id: UUID,
        receiver_id: UUID,
    ) -> Decimal:
        ledger = await load_ledger(db, group_id)
        net = pairwise_net(ledger, payer_id, receiver_id)
        return net if net > ZERO else ZERO

    # ============================================================
    # INITIATE (payer only)
    # ============================================================

    @staticmethod
    async def initiate(
        db: AsyncSession,
        payer_id: UUID,
        group_id: UUID,
        receiver_id: UUID,
        amount: object,
        payment_method: str = PaymentMethod.MARKED_AS_PAID.value,
        note: str | None = None,
        idempotency_key: str | None = None,
    ) -> Settlement:
        if payer_id == receiver_id:
            raise SettlementValidationError(
                "Payer and receiver must be different users."
            )
        if payment_method not in VALID_PAYMENT_METHODS:
            raise SettlementValidationError(
                "Unsupported payment method."
            )
        clean_note = (note or "").strip() or None
        if clean_note is not None and len(clean_note) > MAX_NOTE_LENGTH:
            raise SettlementValidationError(
                "Note must be at most 200 characters."
            )
        clean_key = (idempotency_key or "").strip() or None
        if clean_key is not None and len(clean_key) > 64:
            raise SettlementValidationError(
                "Idempotency key must be at most 64 characters."
            )
        try:
            total = parse_money(amount)
        except (ValueError, ArithmeticError) as exc:
            raise SettlementValidationError(
                "Amount must be a positive decimal string."
            ) from exc
        if total <= ZERO:
            raise SettlementValidationError(
                "Amount must be greater than 0."
            )

        group = await GroupService.get_group_for_user(
            db, payer_id, group_id
        )
        if group is None:
            raise SettlementNotFoundError("Group not found.")
        members = await GroupService.member_user_ids(db, group_id)
        if receiver_id not in members:
            raise SettlementValidationError(
                "Receiver must be a member of the group."
            )

        owed = await SettlementService.outstanding(
            db, group_id, payer_id, receiver_id
        )
        if owed <= ZERO:
            raise SettlementStateError(
                "There is no outstanding debt to settle."
            )
        if total > owed:
            raise SettlementValidationError(
                f"Amount exceeds the outstanding debt of {money(owed)}."
            )

        duplicate = await db.scalar(
            select(Settlement).where(
                Settlement.group_id == group_id,
                Settlement.payer_user_id == payer_id,
                Settlement.receiver_user_id == receiver_id,
                Settlement.amount == total,
                Settlement.status == SettlementStatus.PENDING,
            )
        )
        if duplicate is not None:
            raise SettlementStateError(
                "An identical payment is already awaiting confirmation."
            )

        row = Settlement(
            group_id=group_id,
            payer_user_id=payer_id,
            receiver_user_id=receiver_id,
            amount=total,
            currency=group.currency,
            status=SettlementStatus.PENDING,
            payment_method=PaymentMethod(payment_method),
            note=clean_note,
            idempotency_key=clean_key,
        )
        try:
            async with transaction(db):
                db.add(row)
                await db.flush()
        except IntegrityError as exc:
            # Idempotency-key collision: the first tap won; retrying the
            # same action must not mint a second claim.
            raise SettlementStateError(
                "This payment was already recorded."
            ) from exc
        payer = await db.get(User, payer_id)
        receiver = await db.get(User, receiver_id)
        await emit_settlement(
            db,
            payer_id=payer_id,
            receiver_id=receiver_id,
            group_name=group.name,
            amount=total,
            payer_name=display_name_of(payer, "Someone"),
            receiver_name=display_name_of(receiver),
            status="pending",
        )
        return row

    # ============================================================
    # CONFIRM / REJECT (receiver only) + CANCEL (payer only)
    # ============================================================

    @staticmethod
    async def _locked_for_user(
        db: AsyncSession,
        user_id: UUID,
        settlement_id: UUID,
    ) -> Settlement:
        row = await db.scalar(
            select(Settlement)
            .where(Settlement.id == settlement_id)
            .with_for_update()
        )
        if row is None:
            raise SettlementNotFoundError("Settlement not found.")
        member = await db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == row.group_id,
                GroupMember.user_id == user_id,
            )
        )
        if member is None:
            # Not this user's group: 404, never a membership oracle.
            raise SettlementNotFoundError("Settlement not found.")
        return row

    @staticmethod
    async def confirm(
        db: AsyncSession,
        user_id: UUID,
        settlement_id: UUID,
    ) -> Settlement:
        async with transaction(db):
            row = await SettlementService._locked_for_user(
                db, user_id, settlement_id
            )
            if row.receiver_user_id != user_id:
                raise SettlementPermissionError(
                    "Only the receiver can confirm this payment."
                )
            if row.status != SettlementStatus.PENDING:
                raise SettlementStateError(
                    "This payment has already been resolved."
                )
            row.status = SettlementStatus.PAID
            row.confirmed_at = _utcnow()
            await db.flush()

            # Create notification for the payer that settlement was confirmed
            payer = await db.get(User, row.payer_user_id)
            receiver = await db.get(User, row.receiver_user_id)
            group = await db.get(Group, row.group_id)
            await emit_settlement(
                db,
                payer_id=row.payer_user_id,
                receiver_id=row.receiver_user_id,
                group_name=group.name if group else "Group",
                amount=row.amount,
                payer_name=display_name_of(payer, "Someone"),
                receiver_name=display_name_of(receiver),
                status="paid",
            )
            await NotificationService.wire_settlement_confirmed(
                db=db,
                user_id=row.payer_user_id,
                group_id=row.group_id,
                settlement_amount=money(row.amount),
                payer_name=payer.name if payer and payer.name else "You",
                receiver_name=receiver.name if receiver and receiver.name else "Member",
                context_data={
                    "settlement_id": str(row.id),
                    "amount": money(row.amount),
                    "currency": row.currency,
                    "payer_name": payer.name if payer and payer.name else "You",
                    "receiver_name": receiver.name if receiver and receiver.name else "Member",
                    "group_name": group.name if group else "Group",
                    "confirmed_at": row.confirmed_at.isoformat() if row.confirmed_at else None,
                },
            )
        return row

    @staticmethod
    async def reject(
        db: AsyncSession,
        user_id: UUID,
        settlement_id: UUID,
        reason: str | None = None,
    ) -> Settlement:
        clean_reason = (reason or "").strip() or None
        if clean_reason is not None and len(clean_reason) > MAX_NOTE_LENGTH:
            raise SettlementValidationError(
                "Rejection reason must be at most 200 characters."
            )
        async with transaction(db):
            row = await SettlementService._locked_for_user(
                db, user_id, settlement_id
            )
            if row.receiver_user_id != user_id:
                raise SettlementPermissionError(
                    "Only the receiver can reject this payment."
                )
            if row.status != SettlementStatus.PENDING:
                raise SettlementStateError(
                    "This payment has already been resolved."
                )
            row.status = SettlementStatus.REJECTED
            row.rejection_reason = clean_reason
            await db.flush()
        return row

    @staticmethod
    async def cancel(
        db: AsyncSession,
        user_id: UUID,
        settlement_id: UUID,
    ) -> Settlement:
        async with transaction(db):
            row = await SettlementService._locked_for_user(
                db, user_id, settlement_id
            )
            if row.payer_user_id != user_id:
                raise SettlementPermissionError(
                    "Only the payer can cancel this payment."
                )
            if row.status != SettlementStatus.PENDING:
                raise SettlementStateError(
                    "This payment has already been resolved."
                )
            row.status = SettlementStatus.CANCELLED
            await db.flush()
        return row

    @staticmethod
    async def get_for_user(
        db: AsyncSession,
        user_id: UUID,
        settlement_id: UUID,
    ) -> Settlement:
        row = await db.scalar(
            select(Settlement).where(Settlement.id == settlement_id)
        )
        if row is None:
            raise SettlementNotFoundError("Settlement not found.")
        member = await db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == row.group_id,
                GroupMember.user_id == user_id,
            )
        )
        if member is None:
            raise SettlementNotFoundError("Settlement not found.")
        return row

    # ============================================================
    # PENDING CONFIRMATION QUEUE (receiver's inbox)
    # ============================================================

    @staticmethod
    async def pending_for_receiver(
        db: AsyncSession,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Settlement], list[Group], list[User]]:
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        rows = list(
            (
                await db.execute(
                    select(Settlement)
                    .where(
                        Settlement.receiver_user_id == user_id,
                        Settlement.status == SettlementStatus.PENDING,
                    )
                    .order_by(Settlement.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        groups: list[Group] = []
        payers: list[User] = []
        if rows:
            groups = list(
                (
                    await db.execute(
                        select(Group).where(
                            Group.id.in_({r.group_id for r in rows})
                        )
                    )
                )
                .scalars()
                .all()
            )
            payers = list(
                (
                    await db.execute(
                        select(User).where(
                            User.id.in_({r.payer_user_id for r in rows})
                        )
                    )
                )
                .scalars()
                .all()
            )
        return rows, groups, payers

    # ============================================================
    # HISTORY (confirmed payments only, paginated)
    # ============================================================

    @staticmethod
    async def group_history(
        db: AsyncSession,
        user_id: UUID,
        group_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Settlement], int, Group]:
        group = await GroupService.get_group_for_user(
            db, user_id, group_id
        )
        if group is None:
            raise SettlementNotFoundError("Group not found.")
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        total = int(
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
        rows = list(
            (
                await db.execute(
                    select(Settlement)
                    .where(
                        Settlement.group_id == group_id,
                        Settlement.status == SettlementStatus.PAID,
                    )
                    .order_by(Settlement.confirmed_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        return rows, total, group

    @staticmethod
    async def person_history(
        db: AsyncSession,
        user_id: UUID,
        person_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Settlement], int, dict[UUID, Group]]:
        if user_id == person_id:
            raise SettlementValidationError(
                "Cannot load settlement history with yourself."
            )
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        my_groups = set(await GroupService.my_group_ids(db, user_id))
        person_groups = set(
            await GroupService.my_group_ids(db, person_id)
        )
        common = my_groups & person_groups
        if not common:
            raise SettlementNotFoundError("Person not found.")
        total = int(
            await db.scalar(
                select(func.count())
                .select_from(Settlement)
                .where(
                    Settlement.group_id.in_(common),
                    Settlement.status == SettlementStatus.PAID,
                    or_(
                        (
                            (Settlement.payer_user_id == user_id)
                            & (Settlement.receiver_user_id == person_id)
                        ),
                        (
                            (Settlement.payer_user_id == person_id)
                            & (Settlement.receiver_user_id == user_id)
                        ),
                    ),
                )
            )
            or 0
        )
        rows = list(
            (
                await db.execute(
                    select(Settlement)
                    .where(
                        Settlement.group_id.in_(common),
                        Settlement.status == SettlementStatus.PAID,
                        or_(
                            (
                                (Settlement.payer_user_id == user_id)
                                & (
                                    Settlement.receiver_user_id
                                    == person_id
                                )
                            ),
                            (
                                (Settlement.payer_user_id == person_id)
                                & (Settlement.receiver_user_id == user_id)
                            ),
                        ),
                    )
                    .order_by(Settlement.confirmed_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
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
        return rows, total, groups

    # ============================================================
    # PEOPLE & PERSON DETAIL (active non-zero relationships only)
    # ============================================================

    @staticmethod
    async def people_summary(
        db: AsyncSession,
        user_id: UUID,
        search: str | None = None,
        direction: str = "all",
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict], int]:
        if direction not in ("all", "you_owe", "they_owe"):
            raise SettlementValidationError(
                "direction must be all, you_owe or they_owe."
            )
        limit = max(1, min(limit, 100))
        offset = max(0, offset)

        my_group_ids = await GroupService.my_group_ids(db, user_id)
        if not my_group_ids:
            return [], 0

        co_rows = list(
            (
                await db.execute(
                    select(GroupMember.group_id, GroupMember.user_id).where(
                        GroupMember.group_id.in_(my_group_ids),
                        GroupMember.user_id != user_id,
                    )
                )
            ).all()
        )
        groups_of: dict[UUID, set[UUID]] = {}
        for group_id, member_id in co_rows:
            groups_of.setdefault(member_id, set()).add(group_id)
        if not groups_of:
            return [], 0

        person_ids = list(groups_of)
        user_stmt = select(User).where(User.id.in_(person_ids))
        if search and search.strip():
            pattern = "%" + search.strip().replace(
                "\\", "\\\\"
            ).replace("%", "\\%").replace("_", "\\_") + "%"
            user_stmt = user_stmt.where(
                or_(
                    User.name.ilike(pattern, escape="\\"),
                    User.username.ilike(pattern, escape="\\"),
                )
            )
        persons = list((await db.execute(user_stmt)).scalars().all())
        if not persons:
            return [], 0

        needed_groups = sorted(
            {g for p in persons for g in groups_of[p.id]}
        )
        ledgers = await load_ledgers(db, needed_groups)

        people: list[dict] = []
        for person in persons:
            common = groups_of[person.id]
            you_owe = ZERO
            they_owe = ZERO
            active_groups = 0
            for group_id in common:
                net = pairwise_net(
                    ledgers[group_id], user_id, person.id
                )
                if net > ZERO:
                    you_owe += net
                    active_groups += 1
                elif net < ZERO:
                    they_owe += -net
                    active_groups += 1
            you_owe = quantize(you_owe)
            they_owe = quantize(they_owe)
            net_balance = quantize(they_owe - you_owe)
            if net_balance == ZERO:
                continue  # settled: history context, not active list
            entry_direction = direction_for(-net_balance)
            if direction == "you_owe" and entry_direction != "YOU_OWE":
                continue
            if direction == "they_owe" and entry_direction != "THEY_OWE":
                continue
            people.append(
                {
                    "user": person,
                    "common_group_count": active_groups,
                    "you_owe": money(you_owe),
                    "they_owe": money(they_owe),
                    "net_balance": money(net_balance),
                    "direction": entry_direction,
                }
            )

        # Server-side sort: largest absolute balance first (stable).
        people.sort(
            key=lambda p: (
                quantize(
                    Decimal(p["you_owe"]) + Decimal(p["they_owe"])
                ),
                _display_name(p["user"]).lower(),
            ),
            reverse=True,
        )
        total = len(people)
        return people[offset : offset + limit], total

    @staticmethod
    async def person_detail(
        db: AsyncSession,
        user_id: UUID,
        person_id: UUID,
    ) -> dict:
        if user_id == person_id:
            raise SettlementValidationError(
                "Cannot load settlement detail with yourself."
            )
        person = await db.get(User, person_id)
        if person is None:
            raise SettlementNotFoundError("Person not found.")
        my_groups = set(await GroupService.my_group_ids(db, user_id))
        person_groups = set(
            await GroupService.my_group_ids(db, person_id)
        )
        common = sorted(my_groups & person_groups, key=str)
        if not common:
            raise SettlementNotFoundError("Person not found.")

        ledgers = await load_ledgers(db, common)
        groups_stmt = select(Group).where(Group.id.in_(common))
        group_map = {
            g.id: g
            for g in (await db.execute(groups_stmt)).scalars().all()
        }

        you_owe = ZERO
        they_owe = ZERO
        active: list[dict] = []
        for group_id in common:
            net = pairwise_net(ledgers[group_id], user_id, person_id)
            if net == ZERO:
                continue  # settled groups live in history only
            if net > ZERO:
                you_owe += net
            else:
                they_owe += -net
            group = group_map[group_id]
            active.append(
                {
                    "group": group,
                    "you_owe": money(net if net > ZERO else ZERO),
                    "they_owe": money(-net if net < ZERO else ZERO),
                    "net_balance": money(-net),
                    "direction": direction_for(net),
                }
            )
        you_owe = quantize(you_owe)
        they_owe = quantize(they_owe)
        net_balance = quantize(they_owe - you_owe)
        if net_balance == ZERO:
            # No active debt: settled for current-balance purposes.
            # History may still exist; the active view is empty.
            active = []
        active.sort(key=lambda g: g["group"].name.lower())
        return {
            "person": person,
            "you_owe": money(you_owe),
            "they_owe": money(they_owe),
            "net_balance": money(net_balance),
            "direction": direction_for(-net_balance),
            "groups": active,
        }

    # ============================================================
    # GROUP DETAIL + SUGGESTIONS
    # ============================================================

    @staticmethod
    async def group_detail(
        db: AsyncSession,
        user_id: UUID,
        group_id: UUID,
    ) -> dict:
        group = await GroupService.get_group_for_user(
            db, user_id, group_id
        )
        if group is None:
            raise SettlementNotFoundError("Group not found.")
        members = await GroupService.list_members(db, group_id)
        member_ids = [m.user_id for m in members]
        member_users: list[User] = []
        if member_ids:
            member_users = list(
                (
                    await db.execute(
                        select(User).where(User.id.in_(member_ids))
                    )
                )
                .scalars()
                .all()
            )
        users = {u.id: u for u in member_users}
        roles = {m.user_id: m.role.value for m in members}
        ledger = await load_ledger(db, group_id)
        nets = member_nets(ledger, member_ids)
        settled = all(v == ZERO for v in nets.values())
        my_net = nets.get(user_id, ZERO)
        balances = [
            {
                "user": users[mid],
                "role": roles.get(mid, "member"),
                "net_balance": money(nets[mid]),
                "direction": (
                    "THEY_ARE_OWED"
                    if nets[mid] > ZERO
                    else ("YOU_OWE" if nets[mid] < ZERO else "SETTLED")
                ),
            }
            for mid in member_ids
            if mid in users
        ]
        balances.sort(
            key=lambda b: (
                Decimal(b["net_balance"]),
                _display_name(b["user"]).lower(),
            ),
            reverse=True,
        )
        confirmed = await db.scalar(
            select(func.count())
            .select_from(Settlement)
            .where(
                Settlement.group_id == group_id,
                Settlement.status == SettlementStatus.PAID,
            )
        )
        return {
            "group": group,
            "member_count": len(member_ids),
            "my_net": money(my_net),
            "my_direction": (
                "THEY_OWE_ME"
                if my_net > ZERO
                else ("I_OWE" if my_net < ZERO else "SETTLED")
            ),
            "settlement_status": "settled" if settled else "pending",
            "confirmed_count": int(confirmed or 0),
            "balances": balances,
        }

    @staticmethod
    async def suggestions(
        db: AsyncSession,
        user_id: UUID,
        group_id: UUID,
    ) -> dict:
        group = await GroupService.get_group_for_user(
            db, user_id, group_id
        )
        if group is None:
            raise SettlementNotFoundError("Group not found.")
        members = await GroupService.list_members(db, group_id)
        member_ids = [m.user_id for m in members]
        member_users = (
            list(
                (
                    await db.execute(
                        select(User).where(User.id.in_(member_ids))
                    )
                )
                .scalars()
                .all()
            )
            if member_ids
            else []
        )
        users = {u.id: u for u in member_users}
        ledger = await load_ledger(db, group_id)
        nets = member_nets(ledger, member_ids)
        plan = suggest_payments(nets)
        return {
            "group": group,
            "suggestions": [
                {
                    "payer": users[payer_id],
                    "receiver": users[receiver_id],
                    "amount": money(amount),
                    "currency": group.currency,
                }
                for payer_id, receiver_id, amount in plan
                if payer_id in users and receiver_id in users
            ],
        }

    # ============================================================
    # COUNTS (profile dashboard)
    # ============================================================

    @staticmethod
    async def count_my_confirmed(
        db: AsyncSession,
        user_id: UUID,
    ) -> int:
        return int(
            await db.scalar(
                select(func.count())
                .select_from(Settlement)
                .where(
                    Settlement.status == SettlementStatus.PAID,
                    or_(
                        Settlement.payer_user_id == user_id,
                        Settlement.receiver_user_id == user_id,
                    ),
                )
            )
            or 0
        )

    # ============================================================
    # PRESENTATION HELPERS
    # ============================================================

    @staticmethod
    def display_name(user: User) -> str:
        return _display_name(user)
