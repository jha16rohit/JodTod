# backend/services/activity_events.py

"""
Domain-event fan-out from groups/expenses/settlements into the
user-scoped activity feed.

The activity table is per-user by design (one row per recipient), so
each helper writes one row per affected member via
ActivityService.create_activity — the same per-recipient pattern the
notification wires already use. Every call happens AFTER the caller's
main transaction has committed; each row owns its own short
transaction, so a feed failure can never roll back financial writes.

Copy conventions mirror the existing activity tests/seeds:
- amount is a pre-formatted display string ("₹2,850").
- member_key is the actor's opaque lowercase key (e.g. "neha").
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.activity import ActivityType
from backend.models.user import User
from backend.schemas.activity import ActivityCreate, ActivityParticipant
from backend.services.activity_service import ActivityService
from backend.services.balance_service import money


def display_name_of(user: User | None, fallback: str = "Member") -> str:
    if user is None:
        return fallback
    if user.name and user.name.strip():
        return user.name.strip()
    username = getattr(user, "username", None)
    if username and username.strip():
        return username.strip()
    if user.email:
        return user.email.split("@")[0]
    return fallback


def inr(amount: Decimal) -> str:
    return f"₹{money(amount)}"


def member_key_of(name: str | None) -> str | None:
    clean = (name or "").strip().lower()
    return clean[:64] or None


async def emit_group_created(
    db: AsyncSession,
    *,
    member_ids: list[UUID],
    group_name: str,
    creator_name: str,
) -> None:
    for recipient in member_ids:
        await ActivityService.create_activity(
            db,
            recipient,
            ActivityCreate(
                type=ActivityType.GROUP,
                title=f"Group {group_name} created",
                subtitle=f"Created by {creator_name}",
                group_name=group_name,
                actor_name=creator_name,
                member_key=member_key_of(creator_name),
                status="created",
            ),
        )


async def emit_group_updated(
    db: AsyncSession,
    *,
    member_ids: list[UUID],
    group_name: str,
) -> None:
    for recipient in member_ids:
        await ActivityService.create_activity(
            db,
            recipient,
            ActivityCreate(
                type=ActivityType.GROUP,
                title=f"Group {group_name} updated",
                subtitle="Group settings changed",
                group_name=group_name,
                status="updated",
            ),
        )


async def emit_member_joined(
    db: AsyncSession,
    *,
    member_ids: list[UUID],
    group_name: str,
    new_member_name: str,
    added_by: str | None = None,
) -> None:
    subtitle = (
        f"Added by {added_by}" if added_by else "Joined via invite link"
    )
    for recipient in member_ids:
        await ActivityService.create_activity(
            db,
            recipient,
            ActivityCreate(
                type=ActivityType.MEMBER,
                title=f"{new_member_name} joined {group_name}",
                subtitle=subtitle,
                group_name=group_name,
                actor_name=new_member_name,
                member_key=member_key_of(new_member_name),
                status="joined",
            ),
        )


async def emit_expense_created(
    db: AsyncSession,
    *,
    member_ids: list[UUID],
    member_users: dict[UUID, User],
    group_name: str,
    title: str,
    total: Decimal,
    payer_name: str,
    split_type: str,
    share_map: dict[UUID, Decimal],
) -> None:
    participants = [
        ActivityParticipant(
            name=display_name_of(member_users.get(uid)),
            share=inr(share),
            avatar=getattr(member_users.get(uid), "avatar_url", None),
        )
        for uid, share in share_map.items()
    ]
    for recipient in member_ids:
        await ActivityService.create_activity(
            db,
            recipient,
            ActivityCreate(
                type=ActivityType.EXPENSE,
                title=title,
                subtitle=f"{group_name} • Paid by {payer_name}",
                amount=inr(total),
                group_name=group_name,
                actor_name=payer_name,
                member_key=member_key_of(payer_name),
                split_type=split_type,
                split_among=str(len(share_map)),
                participants=participants,
                status="recorded",
            ),
        )


async def emit_settlement(
    db: AsyncSession,
    *,
    payer_id: UUID,
    receiver_id: UUID,
    group_name: str,
    amount: Decimal,
    payer_name: str,
    receiver_name: str,
    status: str,
) -> None:
    for recipient in (payer_id, receiver_id):
        await ActivityService.create_activity(
            db,
            recipient,
            ActivityCreate(
                type=ActivityType.SETTLEMENT,
                title=f"{payer_name} → {receiver_name}",
                subtitle=group_name,
                amount=inr(amount),
                group_name=group_name,
                actor_name=payer_name,
                counterparty_name=receiver_name,
                member_key=member_key_of(payer_name),
                status=status,
            ),
        )
