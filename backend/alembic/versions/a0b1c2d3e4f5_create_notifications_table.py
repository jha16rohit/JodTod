"""create notifications table

Revision ID: a0b1c2d3e4f5
Revises: 9c1e7a2b4d5f
Create Date: 2026-09-27 14:00:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ENUM as PG_ENUM

# revision identifiers, used by Alembic.
revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, Sequence[str], None] = "h8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", PG_UUID(as_uuid=True), nullable=False, default=uuid.uuid4),
        sa.Column(
            "recipient_user_id",
            PG_UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "notification_type",
            PG_ENUM(
                "expense_added",
                "settlement_completed",
                "group_invitation",
                "group_comment",
                "trip_report_ready",
                "budget_alert",
                "member_joined_group",
                "bill_image_updated",
                "group_settings_updated",
                "system",
                name="notification_type",
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "related_group_id",
            PG_UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "related_expense_id",
            PG_UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "related_settlement_id",
            PG_UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "related_user_id",
            PG_UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "attachment_reference",
            sa.String(length=500),
            nullable=True,
        ),
        sa.Column(
            "context_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "read_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["recipient_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["related_group_id"],
            ["groups.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["related_expense_id"],
            ["expenses.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["related_settlement_id"],
            ["settlements.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["related_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notifications_recipient_user_id",
        "notifications",
        ["recipient_user_id"],
    )
    op.create_index(
        "ix_notifications_recipient_user_id_created_at",
        "notifications",
        ["recipient_user_id", "created_at"],
    )
    op.create_index(
        "ix_notifications_recipient_user_id_read_status",
        "notifications",
        ["recipient_user_id", "read_at"],
    )
    op.create_index(
        "ix_notifications_recipient_type_created",
        "notifications",
        ["recipient_user_id", "notification_type", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_recipient_type_created", table_name="notifications")
    op.drop_index("ix_notifications_recipient_user_id_read_status", table_name="notifications")
    op.drop_index("ix_notifications_recipient_user_id_created_at", table_name="notifications")
    op.drop_index("ix_notifications_recipient_user_id", table_name="notifications")
    op.drop_table("notifications")