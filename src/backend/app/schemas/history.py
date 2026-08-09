from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class HistoryCategoryResponse(BaseModel):
    category_id: int
    name: str | None = None


class HistoryEventResponse(BaseModel):
    event_id: UUID
    title: str | None = None
    description: str | None = None
    location: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    registration_deadline: datetime | None = None
    capacity: int | None = None
    event_status: str | None = None
    banner_url: str | None = None
    event_categories: HistoryCategoryResponse | None = None


class HistoryResponse(BaseModel):
    registration_id: UUID
    user_id: UUID
    event_id: UUID | None = None
    registration_status: Literal[
        "REGISTERED",
        "CHECKED_IN",
        "CANCELLED",
    ] | None = None
    created_at: datetime | None = None
    events: HistoryEventResponse | None = None


class CancelledRegistrationResponse(BaseModel):
    registration_id: UUID
    registration_status: Literal["CANCELLED"]


class CancelRegistrationResponse(BaseModel):
    message: str
    data: list[CancelledRegistrationResponse]
