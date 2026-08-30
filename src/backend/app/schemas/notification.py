from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationOut(BaseModel):
    notification_id: UUID
    user_id: UUID
    event_id: Optional[UUID] = None
    title: str
    type: str
    is_read: bool
    created_at: Optional[datetime] = None
    content: str


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class NotificationUnreadCountOut(BaseModel):
    unread_count: int


class NotificationSyncOut(BaseModel):
    created_count: int


class EventReminderIn(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=2_000)


class EventReminderOut(BaseModel):
    message: str
    recipient_count: int
