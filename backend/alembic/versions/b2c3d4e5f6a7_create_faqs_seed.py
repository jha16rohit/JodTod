"""create faqs table and seed curated entries

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-27 12:00:00.000000

New faqs table (read-only from mobile; only is_active rows served)
plus curated seed rows covering features that actually exist in the
app (groups, expenses, activity, settlements, profile, preferences,
account/security). Seed runs once into the new empty table; no
existing data is touched.
"""

import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

faqs_table = sa.table(
    'faqs',
    sa.column('id', PG_UUID(as_uuid=True)),
    sa.column('question', sa.String()),
    sa.column('answer', sa.Text()),
    sa.column('category', sa.String()),
    sa.column('display_order', sa.Integer()),
    sa.column('is_active', sa.Boolean()),
)

SEED_FAQS: list[tuple[str, str, str]] = [
    (
        'groups',
        'How do I create a group?',
        'Open the Groups tab and tap Create. Give the group a name, '
        'add members, and start tracking shared expenses together.',
    ),
    (
        'groups',
        'How do I join a group with an invite code?',
        'Open Groups, choose Join, and enter the invite code or link '
        'shared by a group member. You can also find this from '
        'Preferences > Group Invitations.',
    ),
    (
        'expenses',
        'How do I add an expense?',
        'Open a group, go to Expenses, and add the amount, category, '
        'and who paid. The expense appears in your Activity feed.',
    ),
    (
        'expenses',
        'Where can I see my recent activity?',
        'The Activity tab lists your newest expense, settlement, and '
        'member events first, grouped by day.',
    ),
    (
        'settlements',
        'How do settlements work?',
        'The Settle tab shows who owes whom based on recorded '
        'expenses. Recording a settlement updates balances for '
        'everyone in the group.',
    ),
    (
        'trips',
        'What are trips?',
        'Trips group related expenses for travel or events. Your '
        'profile shows how many trips you are part of.',
    ),
    (
        'account',
        'How do I update my profile information?',
        'Open My Profile, then Personal Information, and tap Edit. '
        'You can change your full name, username, and phone number. '
        'Your email address cannot be changed.',
    ),
    (
        'account',
        'How do I change my profile photo?',
        'Open Personal Information and tap the camera icon on your '
        'photo. You can take a new photo, choose one from your '
        'gallery, or remove the current photo.',
    ),
    (
        'settings',
        'Which currency does JodTod support?',
        'JodTod currently supports INR (Indian Rupee). Open '
        'Preferences > Currency to confirm your selection. More '
        'currencies will be added later.',
    ),
    (
        'security',
        'How do I reset my password?',
        'On the login screen, tap Forgot Password and follow the '
        'verification steps sent to your email or phone.',
    ),
]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'faqs',
        sa.Column('id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('question', sa.String(length=300), nullable=False),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False, server_default='general'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_faqs_is_active', 'faqs', ['is_active'])
    op.create_index('ix_faqs_category', 'faqs', ['category'])
    op.create_index('ix_faqs_display_order', 'faqs', ['display_order'])

    op.bulk_insert(
        faqs_table,
        [
            {
                'id': uuid.uuid4(),
                'question': question,
                'answer': answer,
                'category': category,
                'display_order': order,
                'is_active': True,
            }
            for order, (category, question, answer) in enumerate(SEED_FAQS)
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_faqs_display_order', table_name='faqs')
    op.drop_index('ix_faqs_category', table_name='faqs')
    op.drop_index('ix_faqs_is_active', table_name='faqs')
    op.drop_table('faqs')
