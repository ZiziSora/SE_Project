from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Boolean,
    Text,
    String,
    Enum,
)

from sqlalchemy.dialects.postgresql import UUID

from sqlalchemy.orm import relationship

from app.database import Base

from .enum import NotificationType


class Notification(Base):
    __tablename__ = "notifications"

    noti_id = Column(
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

    title = Column(String)

    type = Column(
        Enum(NotificationType, name="notification_type")
    )

    is_read = Column(Boolean, default=False)

    created_at = Column(DateTime)

    content = Column(Text)

    user = relationship(
        "User",
        back_populates="notifications"
    )

    event = relationship(
        "Event",
        back_populates="notifications"
    )