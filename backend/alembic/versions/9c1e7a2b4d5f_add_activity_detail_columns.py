"""add activity detail columns

Revision ID: 9c1e7a2b4d5f
Revises: 7a2c9e4f1b3d
Create Date: 2026-09-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9c1e7a2b4d5f'
down_revision: Union[str, Sequence[str], None] = '7a2c9e4f1b3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('activities', sa.Column('actor_name', sa.String(length=120), nullable=True))
    op.add_column('activities', sa.Column('actor_avatar', sa.String(length=500), nullable=True))
    op.add_column('activities', sa.Column('counterparty_name', sa.String(length=120), nullable=True))
    op.add_column('activities', sa.Column('counterparty_avatar', sa.String(length=500), nullable=True))
    op.add_column('activities', sa.Column('counterparty_sub', sa.String(length=160), nullable=True))
    op.add_column('activities', sa.Column('category', sa.String(length=120), nullable=True))
    op.add_column('activities', sa.Column('status', sa.String(length=64), nullable=True))
    op.add_column('activities', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('activities', sa.Column('split_type', sa.String(length=64), nullable=True))
    op.add_column('activities', sa.Column('split_among', sa.String(length=64), nullable=True))
    op.add_column('activities', sa.Column('each_share', sa.String(length=64), nullable=True))
    op.add_column('activities', sa.Column('bill_image', sa.String(length=500), nullable=True))
    op.add_column('activities', sa.Column('participants', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('activities', 'participants')
    op.drop_column('activities', 'bill_image')
    op.drop_column('activities', 'each_share')
    op.drop_column('activities', 'split_among')
    op.drop_column('activities', 'split_type')
    op.drop_column('activities', 'description')
    op.drop_column('activities', 'status')
    op.drop_column('activities', 'category')
    op.drop_column('activities', 'counterparty_sub')
    op.drop_column('activities', 'counterparty_avatar')
    op.drop_column('activities', 'counterparty_name')
    op.drop_column('activities', 'actor_avatar')
    op.drop_column('activities', 'actor_name')
