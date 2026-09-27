"""add display_name to user preferences

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-27 12:00:00.000000

Which stored name the profile UI presents as primary
("account_name" or "username"). NOT NULL with safe default so
existing preference rows remain valid; both name fields stay stored.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('user_preferences', sa.Column('display_name', sa.String(length=16), nullable=False, server_default='account_name'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user_preferences', 'display_name')
