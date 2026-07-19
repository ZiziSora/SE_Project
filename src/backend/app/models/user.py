from sqlalchemy import Column, String, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum

from .enum import UserRole, UserStatus

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String)
    role = Column(SAEnum(UserRole, values_callable=lambda obj: [e.value for e in obj]), default=UserRole.STUDENT)
    status = Column(SAEnum(UserStatus, values_callable=lambda obj: [e.value for e in obj]), default=UserStatus.PENDING)
    student_code = Column(
        String,
        unique=True,
        nullable=True,
    )

    department_name = Column(
        String,
        nullable=True,
    )

    organization_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "organization_types.organization_type_id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    contact_phone = Column(
        String,
        nullable=True,
    )

    office_address = Column(
        String,
        nullable=True,
    )

    organization_description = Column(
        Text,
        nullable=True,
    )

    logo_url = Column(
        String,
        nullable=True,
    )

    # Relationships
    organization_type = relationship(
        "OrganizationType",
        back_populates="users",
    )

    organized_events = relationship(
        "Event",
        back_populates="organizer",
    )

    registrations = relationship(
        "EventRegistration",
        back_populates="user",
    )

    notifications = relationship(
        "Notification",
        back_populates="user",
    )




