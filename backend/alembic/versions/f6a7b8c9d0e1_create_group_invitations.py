"""create group invitations table

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-27 12:00:00.000000

Incoming group invitations addressed to one user (user_id = invitee,
CASCADE on user delete). No groups/memberships tables exist yet, so
each row carries its group snapshot (group_name, invite_code,
invited_by). New table only; no existing data is touched.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'group_invitations',
        sa.Column('id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('group_name', sa.String(length=120), nullable=False),
        sa.Column('invite_code', sa.String(length=64), nullable=False),
        sa.Column('invited_by', sa.String(length=120), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_group_invitations_user_id', 'group_invitations', ['user_id'])
    op.create_index('ix_group_invitations_status', 'group_invitations', ['status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_group_invitations_status', table_name='group_invitations')
    op.drop_index('ix_group_invitations_user_id', table_name='group_invitations')
    op.drop_table('group_invitations')
