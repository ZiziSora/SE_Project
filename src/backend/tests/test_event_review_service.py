from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.models.enum import ApprovalStatus, EventStatus
from app.services.event_review_service import (
    approve_event,
    list_pending_events,
    reject_event,
)


EVENT_ID = UUID("11111111-1111-1111-1111-111111111111")
ORGANIZER_ID = UUID("22222222-2222-2222-2222-222222222222")


def test_list_pending_events_filters_pending_approval_status():
    event = SimpleNamespace(
        event_id=EVENT_ID,
        organizer_id=ORGANIZER_ID,
        category_id=1,
        title="Ngày hội công nghệ",
        description="Sự kiện dành cho sinh viên.",
        location="Hội trường A",
        start_time=None,
        end_time=None,
        registration_deadline=None,
        capacity=200,
        event_status=EventStatus.DRAFT,
        approval_status=ApprovalStatus.PENDING,
        banner_url=None,
        organizer=SimpleNamespace(
            full_name="Câu lạc bộ Công nghệ",
            department_name="Khoa Công nghệ Thông tin",
        ),
        category=SimpleNamespace(name="Công nghệ"),
    )
    query = MagicMock()
    query.options.return_value = query
    query.filter.return_value = query
    query.order_by.return_value = query
    query.all.return_value = [event]
    db = MagicMock()
    db.query.return_value = query

    result = list_pending_events(db)

    condition = query.filter.call_args.args[0]
    assert condition.left.name == "approval_status"
    assert condition.right.value == ApprovalStatus.PENDING
    assert result["total"] == 1
    assert result["items"][0]["event_id"] == EVENT_ID
    assert result["items"][0]["approval_status"] == ApprovalStatus.PENDING
    assert result["items"][0]["organizer_name"] == "Câu lạc bộ Công nghệ"
    assert result["items"][0]["category_name"] == "Công nghệ"


def _pending_query(events):
    query = MagicMock()
    query.options.return_value = query
    query.filter.return_value = query
    query.order_by.return_value = query
    query.all.return_value = events
    db = MagicMock()
    db.query.return_value = query
    return db, query


def test_list_pending_events_skips_cancelled_events():
    """Huỷ sự kiện chỉ đổi `event_status`, `approval_status` vẫn là PENDING.

    Nếu hàng đợi duyệt chỉ lọc theo approval_status thì sự kiện Ban tổ chức
    đã huỷ vẫn nằm chờ Admin — đúng lỗi người dùng báo.
    """
    db, query = _pending_query([])

    list_pending_events(db)

    conditions = query.filter.call_args.args
    assert len(conditions) == 2, "phải lọc thêm điều kiện trên event_status"
    assert "event_status" in str(conditions[1])


def test_approve_event_rejects_cancelled_event():
    event = SimpleNamespace(
        approval_status=ApprovalStatus.PENDING,
        event_status=EventStatus.CANCELLED,
    )
    query = MagicMock()
    query.filter.return_value = query
    query.with_for_update.return_value = query
    query.first.return_value = event
    db = MagicMock()
    db.query.return_value = query

    with pytest.raises(HTTPException) as exc_info:
        approve_event(db, EVENT_ID)

    assert exc_info.value.status_code == 409
    db.commit.assert_not_called()


def test_approve_event_publishes_pending_event():
    event = SimpleNamespace(
        event_id=EVENT_ID,
        organizer_id=ORGANIZER_ID,
        category_id=1,
        title="Ngày hội công nghệ",
        description=None,
        location="Hội trường A",
        start_time=None,
        end_time=None,
        registration_deadline=None,
        capacity=200,
        event_status=EventStatus.DRAFT,
        approval_status=ApprovalStatus.PENDING,
        banner_url=None,
        organizer=None,
        category=None,
    )
    query = MagicMock()
    query.options.return_value = query
    query.filter.return_value = query
    query.with_for_update.return_value = query
    query.first.return_value = event
    db = MagicMock()
    db.query.return_value = query

    result = approve_event(db, EVENT_ID)

    assert event.approval_status == ApprovalStatus.APPROVED
    assert event.event_status == EventStatus.PUBLISHED
    db.commit.assert_called_once_with()
    assert result["approval_status"] == ApprovalStatus.APPROVED
    assert result["event_status"] == EventStatus.PUBLISHED


def test_approve_event_rejects_event_already_reviewed():
    event = SimpleNamespace(approval_status=ApprovalStatus.APPROVED)
    query = MagicMock()
    query.options.return_value = query
    query.filter.return_value = query
    query.with_for_update.return_value = query
    query.first.return_value = event
    db = MagicMock()
    db.query.return_value = query

    with pytest.raises(HTTPException) as exc_info:
        approve_event(db, EVENT_ID)

    assert exc_info.value.status_code == 409
    db.commit.assert_not_called()


def test_reject_event_returns_event_to_draft():
    event = SimpleNamespace(
        event_id=EVENT_ID,
        organizer_id=ORGANIZER_ID,
        category_id=1,
        title="Ngày hội công nghệ",
        description=None,
        location="Hội trường A",
        start_time=None,
        end_time=None,
        registration_deadline=None,
        capacity=200,
        event_status=EventStatus.PUBLISHED,
        approval_status=ApprovalStatus.PENDING,
        banner_url=None,
        organizer=None,
        category=None,
    )
    query = MagicMock()
    query.filter.return_value = query
    query.with_for_update.return_value = query
    query.first.return_value = event
    db = MagicMock()
    db.query.return_value = query

    result = reject_event(db, EVENT_ID)

    assert event.approval_status == ApprovalStatus.REJECTED
    assert event.event_status == EventStatus.DRAFT
    db.commit.assert_called_once_with()
    assert result["approval_status"] == ApprovalStatus.REJECTED
    assert result["event_status"] == EventStatus.DRAFT
