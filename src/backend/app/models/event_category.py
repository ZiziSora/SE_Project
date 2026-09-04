from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class EventCategory(Base):
    __tablename__ = "event_categories"

    category_id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)

    events = relationship(
        "Event",
        back_populates="category"
    )