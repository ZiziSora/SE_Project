from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Enum,
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from .enum import RegistrationStatus


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    registration_id = Column(
        UUID(as_uuid=True),
        primary_key=True
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id")
    )

    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.event_id")
    )

    registration_status = Column(
        Enum(
            RegistrationStatus,
            name="registration_status"
        )
    )

    created_at = Column(DateTime)

    user = relationship(
        "User",
        back_populates="registrations"
    )

    event = relationship(
        "Event",
        back_populates="registrations"
    )

    qr = relationship(
        "EventCheckinQR",
        uselist=False,
        back_populates="registration"
    )