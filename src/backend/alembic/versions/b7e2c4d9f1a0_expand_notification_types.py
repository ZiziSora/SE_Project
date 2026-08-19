"""expand notification types

Revision ID: b7e2c4d9f1a0
Revises: 8eb4b751baac
Create Date: 2026-08-19
"""

from typing import Sequence, Union

from alembic import op


revision: str = "b7e2c4d9f1a0"
down_revision: Union[str, Sequence[str], None] = "8eb4b751baac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NEW_NOTIFICATION_TYPES = (
    "REGISTRATION_CONFIRMED",
    "REGISTRATION_CANCELLED",
    "EVENT_REMINDER",
    "EVENT_LOCATION_CHANGED",
    "EVENT_TIME_CHANGED",
    "WAITLIST_JOINED",
)


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for notification_type in NEW_NOTIFICATION_TYPES:
            op.execute(
                "ALTER TYPE notification_type "
                f"ADD VALUE IF NOT EXISTS '{notification_type}'"
            )


def downgrade() -> None:
    # PostgreSQL cannot directly remove an enum value. Rebuilding the type can
    # destroy notifications that already use new values, so this is intentional.
    pass
