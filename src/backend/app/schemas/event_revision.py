"""Schemas cho yêu cầu chỉnh sửa sự kiện (bảng `event_revisions`)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class FieldChange(BaseModel):
    """Một dòng trong bảng so sánh "giá trị cũ → giá trị mới".

    `old_text` / `new_text` là chuỗi đã định dạng sẵn tiếng Việt để giao diện chỉ
    việc gạch bỏ phần cũ rồi in phần mới, không phải tự xử lý ngày giờ hay tra
    tên danh mục. `old` / `new` giữ giá trị thô cho trường hợp cần dùng lại
    (ví dụ hiển thị ảnh bìa cũ và mới cạnh nhau).
    """

    field: str
    label: str
    old: Any = None
    new: Any = None
    old_text: str = ""
    new_text: str = ""


class EventRevisionOut(BaseModel):
    revision_id: str
    event_id: str
    status: str
    submitted_by: Optional[str] = None
    submitted_at: Optional[datetime] = None

    changed_fields: list[str] = []
    changes: list[FieldChange] = []

    # Ngữ cảnh cho hàng chờ của Admin (danh sách bản sửa không kèm sự kiện)
    event_title: Optional[str] = None
    organizer_name: Optional[str] = None
    organizer_department: Optional[str] = None
    # Tên danh mục ứng với `values["category_id"]` — giao diện khỏi phải tra lại
    category_name: Optional[str] = None

    # Toàn bộ giá trị MỚI của phần nội dung, dùng để nạp lại vào form chỉnh sửa
    # khi Ban tổ chức mở lại sự kiện đang chờ duyệt thay đổi.
    values: dict[str, Any] = {}

    model_config = {"extra": "ignore"}


class EventRevisionListOut(BaseModel):
    items: list[EventRevisionOut]
    total: int


class RevisionDecisionOut(BaseModel):
    message: str
    revision: EventRevisionOut
