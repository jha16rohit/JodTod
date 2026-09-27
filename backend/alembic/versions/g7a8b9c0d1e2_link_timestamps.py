"""add provider link timestamps to users

Revision ID: g7a8b9c0d1e2
Revises: f6a7b8c9d0e1
Create Date: 2026-09-27 12:00:00.000000

connected_at / last_verified_at inputs for the Linked Accounts
contract (google_linked_at / apple_linked_at). Nullable: existing
rows stay valid; backfilled on next OAuth login or explicit link,
cleared on unlink. No existing data is touched.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('google_linked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('apple_linked_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'apple_linked_at')
    op.drop_column('users', 'google_linked_at')
