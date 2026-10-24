"""create user preferences table

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-09-27 12:00:00.000000

One row per user (user_preferences.user_id unique, CASCADE on user
delete). Static configuration only: currency, date_format,
start_of_week, app_language — all NOT NULL with safe server defaults
so existing users remain valid and first access materializes
INR / DD/MM/YYYY / monday / en. No data migration.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'user_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='INR'),
        sa.Column('date_format', sa.String(length=16), nullable=False, server_default='DD/MM/YYYY'),
        sa.Column('start_of_week', sa.String(length=16), nullable=False, server_default='monday'),
        sa.Column('app_language', sa.String(length=8), nullable=False, server_default='en'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_preferences_user_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('user_preferences')
