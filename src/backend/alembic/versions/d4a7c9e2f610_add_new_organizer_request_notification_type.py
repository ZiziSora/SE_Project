"""add organizer request notification type

Revision ID: d4a7c9e2f610
Revises: c1f8e2a1d8c0
Create Date: 2026-08-29
"""

from typing import Sequence, Union

from alembic import op


revision: str = "d4a7c9e2f610"
down_revision: Union[str, Sequence[str], None] = "c1f8e2a1d8c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE notification_type "
            "ADD VALUE IF NOT EXISTS 'NEW_ORGANIZER_REQUEST'"
        )


def downgrade() -> None:
    # PostgreSQL cannot remove a single enum value without rebuilding the type.
    pass
