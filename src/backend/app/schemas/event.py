from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EventOrganizerOut(BaseModel):
    organizer_id: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    department_name: Optional[str] = None
    organization_type: Optional[str] = None
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    office_address: Optional[str] = None


class EventOut(BaseModel):
    event_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    capacity: Optional[int] = None
    event_status: Optional[str] = None
    approval_status: Optional[str] = None
    banner_url: Optional[str] = None
    category_name: Optional[str] = None
    created_at: Optional[datetime] = None
    organizer: Optional[EventOrganizerOut] = None
