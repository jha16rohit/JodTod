"""add users username

Revision ID: f1a2b3c4d5e6
Revises: b3f8c2a91d4e
Create Date: 2026-09-27 12:00:00.000000

Adds the public username handle to users (Page 02: Personal
Information + Edit Profile). Nullable and unique-when-set: existing
users remain valid with NULL. Uniqueness is enforced case-sensitively
by the database; the service layer additionally rejects
case-insensitive collisions. No data migration.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'b3f8c2a91d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('username', sa.String(length=32), nullable=True))
    op.create_unique_constraint('uq_users_username', 'users', ['username'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_users_username', 'users', type_='unique')
    op.drop_column('users', 'username')
