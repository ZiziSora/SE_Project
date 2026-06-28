from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

class OrganizerRequestAttachment(Base):
    __tablename__ = "Organizer_request_attachment"

    attachment_id = Column(UUID(as_uuid=True), primary_key=True)
    request_id = Column(UUID(as_uuid=True),
        ForeignKey("organizer_requests.request_id"))
    url = Column(String)

