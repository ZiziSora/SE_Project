"""Pydantic schemas + toàn bộ business rule về ngày tháng / số lượng người tham gia.

Quy tắc lấy từ tài liệu thiết kế (PA2 - màn hình "Create New Event"):
  - end_time phải sau start_time
  - registration_deadline phải trước hoặc bằng start_time
  - capacity >= 1 (để trống = không giới hạn)
  - Khi lưu DRAFT: KHÔNG bắt buộc điền đủ (validate lỏng)
  - Khi gửi duyệt PENDING: bắt buộc đủ title, category, location, thời gian, deadline
"""
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


# ─── Input ────────────────────────────────────────────────────────────────────


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
    file_url: Optional[str] = None  # URL tài liệu kế hoạch (bucket event_plan)

    @field_validator("title", "location", "description", mode="before")
    @classmethod
    def _strip_blank(cls, v: Any) -> Any:
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @field_validator("category_id", "capacity", mode="before")
    @classmethod
    def _empty_str_to_none(cls, v: Any) -> Any:
        if v in ("", None):
            return None
        return v


class EventCreate(EventBase):
    """Payload tạo sự kiện. `event_status` quyết định mức độ validate."""

    event_status: EventStatus = EventStatus.PENDING
    organizer_id: Optional[str] = None

    @model_validator(mode="after")
    def _validate_business_rules(self) -> "EventCreate":
        if self.event_status not in (EventStatus.DRAFT, EventStatus.PENDING):
            raise ValueError(
                "Sự kiện mới chỉ được tạo ở trạng thái DRAFT (bản nháp) hoặc PENDING (chờ duyệt)."
            )
        _check_dates(self.start_time, self.end_time, self.registration_deadline)

        # Bản nháp được phép thiếu thông tin → chỉ dừng ở kiểm tra ngày tháng
        if self.event_status == EventStatus.DRAFT:
            return self

        missing: list[str] = []
        if not self.title:
            missing.append("Tên sự kiện")
        if self.category_id is None:
            missing.append("Lĩnh vực / Danh mục")
        if not self.location:
            missing.append("Địa điểm")
        if self.start_time is None:
            missing.append("Ngày & giờ bắt đầu")
        if self.end_time is None:
            missing.append("Ngày & giờ kết thúc")
        if self.registration_deadline is None:
            missing.append("Hạn chót đăng ký")
        if missing:
            raise ValueError("Thiếu thông tin bắt buộc: " + ", ".join(missing))
        return self


class EventUpdate(EventBase):
    """Payload cập nhật. Mọi field đều optional (partial update)."""

    event_status: Optional[EventStatus] = None

    @model_validator(mode="after")
    def _validate_business_rules(self) -> "EventUpdate":
        _check_dates(self.start_time, self.end_time, self.registration_deadline)
        return self


class EventStatusUpdate(BaseModel):
    event_status: EventStatus


# ─── Output ───────────────────────────────────────────────────────────────────


class EventOut(BaseModel):
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
    file_url: Optional[str] = None  # URL tài liệu kế hoạch (bucket event_plan)
    event_status: str = EventStatus.DRAFT.value
    can_edit: bool = False
    created_at: Optional[datetime] = None

    model_config = {"extra": "ignore"}


class EventListOut(BaseModel):
    items: list[EventOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryOut(BaseModel):
    category_id: int
    name: str


class StatsOut(BaseModel):
    total: int = 0
    published: int = 0
    draft: int = 0
    pending: int = 0
    ongoing: int = 0
    ended: int = 0
    cancelled: int = 0


class UploadOut(BaseModel):
    url: str
    path: str
    bucket: str
    size: int
    content_type: str


# ─── Helper dùng chung ────────────────────────────────────────────────────────


def _check_dates(
    start: Optional[datetime],
    end: Optional[datetime],
    deadline: Optional[datetime],
) -> None:
    if start and end and end <= start:
        raise ValueError("Thời gian kết thúc phải sau thời gian bắt đầu.")
    if start and deadline and deadline > start:
        raise ValueError("Hạn chót đăng ký phải trước thời điểm sự kiện bắt đầu.")