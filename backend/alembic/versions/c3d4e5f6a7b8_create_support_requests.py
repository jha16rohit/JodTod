"""create support requests table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-27 12:00:00.000000

Generalized support_requests table with a type discriminator
(support | bug | feature_request) instead of three duplicate tables.
Rows are user-scoped (CASCADE on user delete). New table only; no
existing data is touched.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'support_requests',
        sa.Column('id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(length=16), nullable=False),
        sa.Column('subject', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('app_version', sa.String(length=64), nullable=True),
        sa.Column('screen', sa.String(length=120), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='open'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_support_requests_user_id', 'support_requests', ['user_id'])
    op.create_index('ix_support_requests_type', 'support_requests', ['type'])
    op.create_index('ix_support_requests_status', 'support_requests', ['status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_support_requests_status', table_name='support_requests')
    op.drop_index('ix_support_requests_type', table_name='support_requests')
    op.drop_index('ix_support_requests_user_id', table_name='support_requests')
    op.drop_table('support_requests')
