"""add users avatar_url

Revision ID: b3f8c2a91d4e
Revises: 9c1e7a2b4d5f
Create Date: 2026-09-27 12:00:00.000000

Adds the persisted profile-photo storage reference to users.
Nullable: existing users remain valid with no photo.
No data migration: all existing rows default to NULL.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3f8c2a91d4e'
down_revision: Union[str, Sequence[str], None] = '9c1e7a2b4d5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'avatar_url')
