"""add waitlisted to registration status enum

Revision ID: c1f8e2a1d8c0
Revises: b7e2c4d9f1a0
Create Date: 2026-08-28
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c1f8e2a1d8c0"
down_revision: Union[str, Sequence[str], None] = "b7e2c4d9f1a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE registration_status "
            "ADD VALUE IF NOT EXISTS 'WAITLISTED'"
        )
        op.execute(
            "ALTER TYPE registration_status "
            "ADD VALUE IF NOT EXISTS 'waitlisted'"
        )


def downgrade() -> None:
    pass
