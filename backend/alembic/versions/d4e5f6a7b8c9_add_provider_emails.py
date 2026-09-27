"""add provider emails to users

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-27 12:00:00.000000

Display metadata for the existing subject-column provider links
(users.google_subject / users.apple_subject, Page: OAuth login).
google_email / apple_email hold the verified provider email shown on
the Linked Accounts page; the subject columns remain the identity
source of truth (no duplicate provider table). Nullable: existing
users and logins remain valid; emails backfill on next OAuth login
or explicit link.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('google_email', sa.String(length=320), nullable=True))
    op.add_column('users', sa.Column('apple_email', sa.String(length=320), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'apple_email')
    op.drop_column('users', 'google_email')
