"""create groups expenses settlements tables

Revision ID: h8c9d0e1f2a3
Revises: g7a8b9c0d1e2
Create Date: 2026-09-27 12:00:00.000000

People & Settlements backend (reviewed autogenerate output from
`alembic check`; SQL hand-written to match models exactly):

- groups + group_members: Group is the common container for shared
  financial activity (trips, hostel, rent, food, college, other).
- expenses + expense_splits: who owes whom because of shared spending.
- settlements: who paid whom to reduce debt (PENDING until the
  receiver confirms; only PAID rows reduce balances).

New tables only; no existing data is touched. No seed/demo rows.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


# revision identifiers, used by Alembic.
revision: str = 'h8c9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = 'g7a8b9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


group_type_enum = PG_ENUM(
    'trip', 'hostel', 'food', 'rent', 'friends', 'college', 'other',
    name='group_type',
)
group_lifecycle_enum = PG_ENUM(
    'active', 'archived',
    name='group_lifecycle',
)
member_role_enum = PG_ENUM(
    'admin', 'member',
    name='member_role',
)
settlement_status_enum = PG_ENUM(
    'pending', 'partially_paid', 'paid', 'rejected', 'cancelled',
    name='settlement_status',
)
payment_method_enum = PG_ENUM(
    'marked_as_paid', 'partial_payment',
    name='payment_method',
)


def upgrade() -> None:
    """Upgrade schema."""
    # NOTE: the PG ENUM types are created implicitly by op.create_table
    # (SQLAlchemy emits CREATE TYPE first). Do NOT pre-create them here:
    # an explicit create + the implicit one double-fires and fails
    # with DuplicateObject.
    op.create_table(
        'groups',
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('group_type', group_type_enum, nullable=False, server_default='other'),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='INR'),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('lifecycle', group_lifecycle_enum, nullable=False, server_default='active'),
        sa.Column('invite_code', sa.String(length=32), nullable=False),
        sa.Column('created_by', PG_UUID(as_uuid=True), nullable=True),
        sa.Column('id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invite_code'),
    )
    op.create_index('ix_groups_created_by', 'groups', ['created_by'])
    op.create_index('ix_groups_lifecycle', 'groups', ['lifecycle'])

    op.create_table(
        'group_members',
        sa.Column('group_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('role', member_role_enum, nullable=False, server_default='member'),
        sa.Column('id', PG_UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('group_id', 'user_id', name='uq_group_members_pair'),
    )
    op.create_index('ix_group_members_group_id', 'group_members', ['group_id'])
    op.create_index('ix_group_members_user_id', 'group_members', ['user_id'])

    op.create_table(
        'expenses',
        sa.Column('group_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='INR'),
        sa.Column('payer_user_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('expense_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('amount > 0', name='amount_positive'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payer_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_expenses_group_id', 'expenses', ['group_id'])
    op.create_index('ix_expenses_payer_user_id', 'expenses', ['payer_user_id'])

    op.create_table(
        'expense_splits',
        sa.Column('expense_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('share_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('id', PG_UUID(as_uuid=True), nullable=False),
        sa.CheckConstraint('share_amount >= 0', name='share_non_negative'),
        sa.ForeignKeyConstraint(['expense_id'], ['expenses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('expense_id', 'user_id', name='uq_expense_splits_pair'),
    )
    op.create_index('ix_expense_splits_expense_id', 'expense_splits', ['expense_id'])
    op.create_index('ix_expense_splits_user_id', 'expense_splits', ['user_id'])

    op.create_table(
        'settlements',
        sa.Column('group_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('payer_user_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('receiver_user_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='INR'),
        sa.Column('status', settlement_status_enum, nullable=False, server_default='pending'),
        sa.Column('payment_method', payment_method_enum, nullable=False, server_default='marked_as_paid'),
        sa.Column('note', sa.String(length=200), nullable=True),
        sa.Column('idempotency_key', sa.String(length=64), nullable=True),
        sa.Column('initiated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.String(length=200), nullable=True),
        sa.Column('id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('amount > 0', name='amount_positive'),
        sa.CheckConstraint('payer_user_id != receiver_user_id', name='payer_is_not_receiver'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payer_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['receiver_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key'),
    )
    op.create_index('ix_settlements_group_id', 'settlements', ['group_id'])
    op.create_index('ix_settlements_payer_user_id', 'settlements', ['payer_user_id'])
    op.create_index('ix_settlements_receiver_user_id', 'settlements', ['receiver_user_id'])
    op.create_index('ix_settlements_status', 'settlements', ['status'])
    op.create_index('ix_settlements_created_at', 'settlements', ['created_at'])
    op.create_index('ix_settlements_confirmed_at', 'settlements', ['confirmed_at'])
    op.create_index(
        'ix_settlements_receiver_status_created', 'settlements',
        ['receiver_user_id', 'status', 'created_at'],
    )
    op.create_index(
        'ix_settlements_group_status_created', 'settlements',
        ['group_id', 'status', 'created_at'],
    )
    op.create_index(
        'ix_settlements_payer_receiver_created', 'settlements',
        ['payer_user_id', 'receiver_user_id', 'created_at'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_settlements_payer_receiver_created', table_name='settlements')
    op.drop_index('ix_settlements_group_status_created', table_name='settlements')
    op.drop_index('ix_settlements_receiver_status_created', table_name='settlements')
    op.drop_index('ix_settlements_confirmed_at', table_name='settlements')
    op.drop_index('ix_settlements_created_at', table_name='settlements')
    op.drop_index('ix_settlements_status', table_name='settlements')
    op.drop_index('ix_settlements_receiver_user_id', table_name='settlements')
    op.drop_index('ix_settlements_payer_user_id', table_name='settlements')
    op.drop_index('ix_settlements_group_id', table_name='settlements')
    op.drop_table('settlements')
    op.drop_index('ix_expense_splits_user_id', table_name='expense_splits')
    op.drop_index('ix_expense_splits_expense_id', table_name='expense_splits')
    op.drop_table('expense_splits')
    op.drop_index('ix_expenses_payer_user_id', table_name='expenses')
    op.drop_index('ix_expenses_group_id', table_name='expenses')
    op.drop_table('expenses')
    op.drop_index('ix_group_members_user_id', table_name='group_members')
    op.drop_index('ix_group_members_group_id', table_name='group_members')
    op.drop_table('group_members')
    op.drop_index('ix_groups_lifecycle', table_name='groups')
    op.drop_index('ix_groups_created_by', table_name='groups')
    op.drop_table('groups')
    payment_method_enum.drop(op.get_bind(), checkfirst=True)
    settlement_status_enum.drop(op.get_bind(), checkfirst=True)
    member_role_enum.drop(op.get_bind(), checkfirst=True)
    group_lifecycle_enum.drop(op.get_bind(), checkfirst=True)
    group_type_enum.drop(op.get_bind(), checkfirst=True)
