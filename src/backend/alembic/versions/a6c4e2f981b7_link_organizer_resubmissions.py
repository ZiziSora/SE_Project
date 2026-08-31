"""link organizer resubmissions and store rejection reasons

Revision ID: a6c4e2f981b7
Revises: f2b8d6a4c901
Create Date: 2026-08-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "a6c4e2f981b7"
down_revision: Union[str, Sequence[str], None] = "f2b8d6a4c901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizer_requests",
        sa.Column("rejected_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "organizer_requests",
        sa.Column(
            "previous_request_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_organizer_requests_previous_request_id",
        "organizer_requests",
        "organizer_requests",
        ["previous_request_id"],
        ["request_id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_organizer_requests_previous_request_id",
        "organizer_requests",
        ["previous_request_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_organizer_requests_previous_request_id",
        table_name="organizer_requests",
    )
    op.drop_constraint(
        "fk_organizer_requests_previous_request_id",
        "organizer_requests",
        type_="foreignkey",
    )
    op.drop_column("organizer_requests", "previous_request_id")
    op.drop_column("organizer_requests", "rejected_reason")
