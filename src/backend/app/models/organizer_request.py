from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.database import Base
from .enum import OrganizerRequestStatus

class OrganizerRequest(Base):
    __tablename__ = "organizer_requests"

    request_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=False,)
    reason = Column(String)
    status = Column(SAEnum(OrganizerRequestStatus, values_callable=lambda obj: [e.value for e in obj]), default=OrganizerRequestStatus.PENDING)
    reviewed_by = Column(UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=True)
    create_at = Column(DateTime(timezone=True),
        server_default=func.now(),
        nullable=False)
    