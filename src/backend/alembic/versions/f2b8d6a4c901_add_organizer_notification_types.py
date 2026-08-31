"""add organizer notification types

Revision ID: f2b8d6a4c901
Revises: d4a7c9e2f610
Create Date: 2026-08-30
"""

from typing import Sequence, Union

from alembic import op


revision: str = "f2b8d6a4c901"
down_revision: Union[str, Sequence[str], None] = "d4a7c9e2f610"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NEW_NOTIFICATION_TYPES = (
    "NEW_EVENT_REGISTRATION",
    "ORGANIZER_REQUEST_APPROVED",
    "ORGANIZER_REQUEST_REJECTED",
    "EVENT_APPROVED",
    "EVENT_REJECTED",
)


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for notification_type in NEW_NOTIFICATION_TYPES:
            op.execute(
                "ALTER TYPE notification_type "
                f"ADD VALUE IF NOT EXISTS '{notification_type}'"
            )


def downgrade() -> None:
    # PostgreSQL cannot remove individual enum values without rebuilding it.
    pass
