from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class WaitingList(Base):
    __tablename__ = "waiting_list"

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

    join_at = Column(DateTime)