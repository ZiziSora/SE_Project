from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class EventCheckinQR(Base):
    __tablename__ = "event_checkin_qr"

    registration_id = Column(
        UUID(as_uuid=True),
        ForeignKey("event_registrations.registration_id"),
        primary_key=True
    )

    qr_token = Column(String, unique=True)

    manual_code = Column(String)

    created_at = Column(DateTime)

    expired_at = Column(DateTime)

    registration = relationship(
        "EventRegistration",
        back_populates="qr"
    )