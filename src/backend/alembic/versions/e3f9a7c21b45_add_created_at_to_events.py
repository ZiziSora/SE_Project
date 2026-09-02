"""add created_at to events

Revision ID: e3f9a7c21b45
Revises: a6c4e2f981b7
Create Date: 2026-09-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e3f9a7c21b45"
down_revision: Union[str, Sequence[str], None] = "a6c4e2f981b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Mốc thời gian tạo sự kiện — cần cho bộ lọc "Mới nhất" ở trang Khám phá.
    # server_default=now() để các dòng đã có được backfill và mọi insert sau này
    # (kể cả qua Supabase client, vốn không gửi cột này) đều tự điền.
    op.add_column(
        "events",
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("events", "created_at")
