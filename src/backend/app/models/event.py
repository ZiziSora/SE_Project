from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    Text,
    Enum,
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from .enum import EventStatus, ApprovalStatus


class Event(Base):
    __tablename__ = "events"

    event_id = Column(UUID(as_uuid=True), primary_key=True)

    organizer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id")
    )

    category_id = Column(
        Integer,
        ForeignKey("event_categories.category_id")
    )

    title = Column(String)
    description = Column(Text)

    location = Column(String)

    start_time = Column(DateTime)
    end_time = Column(DateTime)

    registration_deadline = Column(DateTime)

    capacity = Column(Integer)

    event_status = Column(
        Enum(EventStatus, name="event_status"),
        default=EventStatus.DRAFT.value
    )

    approval_status = Column(
        Enum(ApprovalStatus, name="approval_status"),
        default=ApprovalStatus.PENDING.value
    )

    banner_url = Column(String)

    organizer = relationship(
        "User",
        back_populates="organized_events"
    )

    category = relationship(
        "EventCategory",
        back_populates="events"
    )

    registrations = relationship(
        "EventRegistration",
        back_populates="event"
    )

    notifications = relationship(
        "Notification",
        back_populates="event"
    )