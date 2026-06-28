from sqlalchemy import Column, String, ForeignKey, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from .enum import OrganizerRequestStatus

class OrganizerRequest(Base):
    __tablename__ = "organizer_requests"

    request_id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=False,)
    reason = Column(String)
    status = Column(Enum(OrganizerRequestStatus), default=OrganizerRequestStatus.PENDING.value)
    reviewed_by = Column(UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=True)
    create_at = Column(DateTime)
    