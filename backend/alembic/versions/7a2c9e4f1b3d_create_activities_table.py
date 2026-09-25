"""create activities table

Revision ID: 7a2c9e4f1b3d
Revises: 55fd1c0613b0
Create Date: 2026-09-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7a2c9e4f1b3d'
down_revision: Union[str, Sequence[str], None] = '55fd1c0613b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE TYPE activity_type AS ENUM ('expense', 'settlement', 'member', 'group')")
    op.create_table('activities',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('type', postgresql.ENUM('expense', 'settlement', 'member', 'group', name='activity_type', create_type=False), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('subtitle', sa.String(length=300), nullable=True),
    sa.Column('amount', sa.String(length=64), nullable=True),
    sa.Column('occurred_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('member_key', sa.String(length=64), nullable=True),
    sa.Column('group_name', sa.String(length=120), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_activities_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_activities'))
    )
    op.create_index('ix_activities_member_key', 'activities', ['member_key'], unique=False)
    op.create_index('ix_activities_occurred_at', 'activities', ['occurred_at'], unique=False)
    op.create_index('ix_activities_type', 'activities', ['type'], unique=False)
    op.create_index('ix_activities_user_id', 'activities', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_activities_user_id', table_name='activities')
    op.drop_index('ix_activities_type', table_name='activities')
    op.drop_index('ix_activities_occurred_at', table_name='activities')
    op.drop_index('ix_activities_member_key', table_name='activities')
    op.drop_table('activities')
    op.execute("DROP TYPE activity_type")
