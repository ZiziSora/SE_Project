from sqlalchemy import Column, String
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String)
    role = Column(String, default="attendee")