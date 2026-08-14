from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.enum import ApprovalStatus, EventStatus


class EventReviewResponse(BaseModel):
    event_id: UUID
    organizer_id: UUID | None = None
    organizer_name: str | None = None
    organizer_department: str | None = None
    category_id: int | None = None
    category_name: str | None = None
    title: str | None = None
    description: str | None = None
    location: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    registration_deadline: datetime | None = None
    capacity: int | None = None
    event_status: EventStatus | None = None
    approval_status: ApprovalStatus
    banner_url: str | None = None


class EventReviewListResponse(BaseModel):
    items: list[EventReviewResponse]
    total: int


class EventApprovalResponse(BaseModel):
    message: str
    event: EventReviewResponse


class EventRejectResponse(BaseModel):
    message: str
    event: EventReviewResponse
