import uuid

from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class OrganizationType(Base):
    __tablename__ = "organization_types"

    organization_type_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name = Column(
        String,
        nullable=False,
        unique=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    users = relationship(
        "User",
        back_populates="organization_type",
    )