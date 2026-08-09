"""fix user table and add organization_type table

Revision ID: 187921227c31
Revises: 1decd7c2c703
Create Date: 2026-07-18 22:09:37.613067
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "187921227c31"
down_revision: Union[str, Sequence[str], None] = "1decd7c2c703"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1. Create organization_types table
    op.create_table(
        "organization_types",
        sa.Column(
            "organization_type_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint(
            "organization_type_id",
            name="pk_organization_types",
        ),
        sa.UniqueConstraint(
            "name",
            name="uq_organization_types_name",
        ),
    )

    # 2. Fill NULL values before changing create_at to NOT NULL
    op.execute(
        """
        UPDATE organizer_requests
        SET create_at = CURRENT_TIMESTAMP
        WHERE create_at IS NULL
        """
    )

    # 3. Make create_at timezone-aware, NOT NULL,
    # and give it a database default
    op.alter_column(
        "organizer_requests",
        "create_at",
        existing_type=postgresql.TIMESTAMP(),
        type_=sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP"),
    )

    # 4. Add organizer-specific fields to users
    op.add_column(
        "users",
        sa.Column(
            "organization_type_id",
            sa.UUID(),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "contact_phone",
            sa.String(),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "office_address",
            sa.String(),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "organization_description",
            sa.Text(),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "logo_url",
            sa.String(),
            nullable=True,
        ),
    )

    # 5. Add index
    op.create_index(
        "ix_users_organization_type_id",
        "users",
        ["organization_type_id"],
        unique=False,
    )

    # 6. Add foreign key with an explicit name
    op.create_foreign_key(
        "fk_users_organization_type_id",
        "users",
        "organization_types",
        ["organization_type_id"],
        ["organization_type_id"],
        ondelete="SET NULL",
    )

    # Do not drop avatar_url because it is still used by users.
    # op.drop_column("users", "avatar_url")


def downgrade() -> None:
    """Downgrade schema."""

    # Remove foreign key first
    op.drop_constraint(
        "fk_users_organization_type_id",
        "users",
        type_="foreignkey",
    )

    op.drop_index(
        "ix_users_organization_type_id",
        table_name="users",
    )

    # Remove new user columns
    op.drop_column("users", "logo_url")
    op.drop_column("users", "organization_description")
    op.drop_column("users", "office_address")
    op.drop_column("users", "contact_phone")
    op.drop_column("users", "organization_type_id")

    # Restore previous create_at definition
    op.alter_column(
        "organizer_requests",
        "create_at",
        existing_type=sa.DateTime(timezone=True),
        type_=postgresql.TIMESTAMP(),
        nullable=True,
        server_default=None,
    )

    # Drop organization_types last
    op.drop_table("organization_types")