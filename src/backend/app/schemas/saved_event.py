from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.event import EventOut


class SavedEventStatusOut(BaseModel):
    saved: bool


class SaveEventResponseOut(BaseModel):
    saved: bool = True
    already_saved: bool


class RemoveSavedEventResponseOut(BaseModel):
    removed: bool


class SavedEventOut(BaseModel):
    event_id: str
    student_id: str
    saved_at: Optional[datetime] = None
    events: Optional[EventOut] = None
