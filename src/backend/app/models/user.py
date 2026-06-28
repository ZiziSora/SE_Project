from sqlalchemy import Column, String, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum

from .enum import UserRole, UserStatus

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.STUDENT.value)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING.value)
    student_code = Column(String, unique=True)
    avatar_url = Column(String, nullable=True)
    department_name = Column(String)

    organized_events = relationship(
        "Event",
        back_populates="organizer"
    )

    registrations = relationship(
        "EventRegistration",
        back_populates="user"
    )

    notifications = relationship(
        "Notification",
        back_populates="user"
    )




