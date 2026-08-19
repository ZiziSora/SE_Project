"""Yêu cầu chỉnh sửa một sự kiện ĐÃ ĐƯỢC DUYỆT.

Sự kiện đang công khai thì không ghi đè thẳng lên bảng `events` nữa: dữ liệu mới
nằm ở đây chờ Admin duyệt, còn `events` vẫn giữ bản đang chạy cho sinh viên xem.
Xem `backend/sql/2026_08_19_event_revisions.sql` để biết DDL tương ứng.
"""

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

from .enum import RevisionStatus


class EventRevision(Base):
    __tablename__ = "event_revisions"

    revision_id = Column(UUID(as_uuid=True), primary_key=True)

    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("events.event_id", ondelete="CASCADE"),
    )

    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    status = Column(
        Enum(RevisionStatus, name="revision_status"),
        default=RevisionStatus.PENDING.value,
    )

    # ─── Dữ liệu MỚI: sao chép đúng cấu trúc phần nội dung của bảng events ───
    title = Column(String)
    category_id = Column(
        Integer,
        ForeignKey("event_categories.category_id"),
    )
    location = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    registration_deadline = Column(DateTime)
    capacity = Column(Integer)
    description = Column(Text)
    banner_url = Column(String)
    file_url = Column(Text)

    # Không có cột giá trị cũ: khi bản sửa còn PENDING thì bảng `events` vẫn
    # đang giữ nội dung cũ, backend so hai bên để ra bảng "cũ → mới".
    # Cũng không lưu ai duyệt / duyệt lúc nào / lý do — kết quả nằm ở `status`.

    event = relationship("Event", back_populates="revisions")
    submitter = relationship("User", foreign_keys=[submitted_by])
