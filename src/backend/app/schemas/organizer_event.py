"""Schemas for organizer-facing event management APIs."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class EventStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    PUBLISHED = "PUBLISHED"
    ONGOING = "ONGOING"
    ENDED = "ENDED"
    CANCELLED = "CANCELLED"


class EventBase(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    category_id: Optional[int] = None
    location: Optional[str] = Field(None, max_length=255)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    capacity: Optional[int] = Field(None, ge=1, le=1_000_000)
    description: Optional[str] = None
    banner_url: Optional[str] = None
    file_url: Optional[str] = None

    @field_validator("title", "location", "description", mode="before")
    @classmethod
    def _strip_blank(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("category_id", "capacity", mode="before")
    @classmethod
    def _empty_str_to_none(cls, value: Any) -> Any:
        return None if value in ("", None) else value


class EventCreate(EventBase):
    event_status: EventStatus = EventStatus.PENDING

    @model_validator(mode="after")
    def _validate_business_rules(self) -> "EventCreate":
        if self.event_status not in (EventStatus.DRAFT, EventStatus.PENDING):
            raise ValueError(
                "Sự kiện mới chỉ được tạo ở trạng thái DRAFT hoặc PENDING."
            )
        _check_dates(self.start_time, self.end_time, self.registration_deadline)
        if self.event_status == EventStatus.PENDING:
            missing = missing_required_fields(self)
            if missing:
                raise ValueError(
                    "Thiếu thông tin bắt buộc: " + ", ".join(missing)
                )
        return self


class EventUpdate(EventBase):
    event_status: Optional[EventStatus] = None

    @model_validator(mode="after")
    def _validate_business_rules(self) -> "EventUpdate":
        _check_dates(self.start_time, self.end_time, self.registration_deadline)
        return self


class EventStatusUpdate(BaseModel):
    event_status: EventStatus


class OrganizerEventOut(BaseModel):
    event_id: Optional[str] = None
    title: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    capacity: Optional[int] = None
    registered_count: int = 0
    seats_left: Optional[int] = None
    is_full: bool = False
    is_registration_open: bool = False
    description: Optional[str] = None
    banner_url: Optional[str] = None
    file_url: Optional[str] = None
    event_status: str = EventStatus.DRAFT.value
    can_edit: bool = False
    requires_reapproval: bool = False
    created_at: Optional[datetime] = None

    model_config = {"extra": "ignore"}


class EventListOut(BaseModel):
    items: list[OrganizerEventOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class StatsOut(BaseModel):
    total: int = 0
    published: int = 0
    draft: int = 0
    pending: int = 0
    ongoing: int = 0
    ended: int = 0
    cancelled: int = 0


REQUIRED_FOR_SUBMIT: list[tuple[str, str]] = [
    ("title", "Tên sự kiện"),
    ("category_id", "Lĩnh vực / Danh mục"),
    ("location", "Địa điểm"),
    ("start_time", "Ngày và giờ bắt đầu"),
    ("end_time", "Ngày và giờ kết thúc"),
    ("registration_deadline", "Hạn chót đăng ký"),
    ("file_url", "Tệp kế hoạch sự kiện"),
]


def missing_required_fields(data: Any) -> list[str]:
    getter = data.get if isinstance(data, dict) else lambda key: getattr(data, key, None)
    return [
        label
        for field, label in REQUIRED_FOR_SUBMIT
        if (value := getter(field)) is None
        or (isinstance(value, str) and not value.strip())
    ]


def _check_dates(
    start: Optional[datetime],
    end: Optional[datetime],
    deadline: Optional[datetime],
) -> None:
    if start and end and end <= start:
        raise ValueError("Thời gian kết thúc phải sau thời gian bắt đầu.")
    if start and deadline and deadline > start:
        raise ValueError(
            "Hạn chót đăng ký phải trước thời điểm sự kiện bắt đầu."
        )
