from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class SavedEvent(Base):
    __tablename__ = "saved_events"

    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.event_id"),
        primary_key=True
    )

    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        primary_key=True
    )

    saved_at = Column(DateTime)