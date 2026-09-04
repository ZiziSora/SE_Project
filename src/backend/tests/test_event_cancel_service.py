"""Huỷ sự kiện: giữ bản ghi ở trạng thái Đã huỷ + báo cho sinh viên kèm lý do."""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.enum import NotificationType
from app.services import event_service


EVENT_ID = "11111111-1111-1111-1111-111111111111"
ORGANIZER_ID = "33333333-3333-3333-3333-333333333333"


def _query(data):
    chain = MagicMock()
    for method in ("select", "eq", "maybe_single", "insert", "update"):
        getattr(chain, method).return_value = chain
    chain.execute.return_value = MagicMock(data=data, count=1)
    return chain


def _event(event_status="PUBLISHED", approval_status="APPROVED"):
    return {
        "event_id": EVENT_ID,
        "title": "Hội thảo AI",
        "location": "Hội trường A",
        "event_status": event_status,
        "approval_status": approval_status,
        "capacity": 100,
    }


def _patches(func):
    """Bọc chung các mock hạ tầng để mỗi test chỉ nói về nghiệp vụ huỷ."""
    # Thứ tự áp dụng = thứ tự tham số của hàm test: decorator được áp dụng
    # trước nằm trong cùng, nên mock của nó là tham số đầu tiên.
    for decorator in (
        patch("app.services.event_service.notification_service"),
        patch("app.services.event_service.event_revision_service"),
        patch("app.services.event_service._validate_capacity_against_registrations"),
        patch("app.services.event_service._registration_counts", return_value={}),
        patch("app.services.event_service._category_map", return_value={}),
        patch("app.services.event_service._get_raw"),
        patch("app.services.event_service.get_supabase"),
    ):
        func = decorator(func)
    return func


@_patches
def test_cancel_published_event_notifies_students_with_reason(
    mock_notification,
    _revisions,
    _capacity,
    _counts,
    _categories,
    mock_get_raw,
    mock_get_supabase,
):
    current = _event()
    mock_get_raw.return_value = current
    mock_get_supabase.return_value.table.return_value = _query(
        [{**current, "event_status": "CANCELLED"}]
    )

    result = event_service.cancel_event(
        EVENT_ID, ORGANIZER_ID, "Diễn giả báo bận đột xuất"
    )

    assert result.event_status == "CANCELLED"
    mock_notification.notify_event_participants.assert_called_once()
    kwargs = mock_notification.notify_event_participants.call_args.kwargs
    assert kwargs["notification_type"] == NotificationType.EVENT_CANCELLED
    assert "Diễn giả báo bận đột xuất" in kwargs["content"]


@_patches
def test_cancel_published_event_requires_reason(
    mock_notification,
    _revisions,
    _capacity,
    _counts,
    _categories,
    mock_get_raw,
    mock_get_supabase,
):
    mock_get_raw.return_value = _event()

    with pytest.raises(HTTPException) as exc_info:
        event_service.cancel_event(EVENT_ID, ORGANIZER_ID, "   ")

    assert exc_info.value.status_code == 422
    mock_notification.notify_event_participants.assert_not_called()


@_patches
def test_cancel_pending_event_needs_no_reason_and_no_notification(
    mock_notification,
    _revisions,
    _capacity,
    _counts,
    _categories,
    mock_get_raw,
    mock_get_supabase,
):
    """Sự kiện mới chờ duyệt thì chưa ai đăng ký được — không có ai để báo."""
    current = _event(event_status="DRAFT", approval_status="PENDING")
    mock_get_raw.return_value = current
    mock_get_supabase.return_value.table.return_value = _query(
        [{**current, "event_status": "CANCELLED"}]
    )

    result = event_service.cancel_event(EVENT_ID, ORGANIZER_ID, None)

    assert result.event_status == "CANCELLED"
    mock_notification.notify_event_participants.assert_not_called()


@_patches
def test_cancel_draft_event_is_rejected(
    _notification,
    _revisions,
    _capacity,
    _counts,
    _categories,
    mock_get_raw,
    _mock_get_supabase,
):
    """Bản nháp chưa từng công khai: hành động đúng là xoá, không phải huỷ."""
    mock_get_raw.return_value = _event(event_status="DRAFT", approval_status=None)

    with pytest.raises(HTTPException) as exc_info:
        event_service.cancel_event(EVENT_ID, ORGANIZER_ID, "Không cần nữa")

    assert exc_info.value.status_code == 409


@_patches
def test_cancel_already_cancelled_event_is_rejected(
    _notification,
    _revisions,
    _capacity,
    _counts,
    _categories,
    mock_get_raw,
    _mock_get_supabase,
):
    mock_get_raw.return_value = _event(event_status="CANCELLED")

    with pytest.raises(HTTPException) as exc_info:
        event_service.cancel_event(EVENT_ID, ORGANIZER_ID, "Huỷ lần nữa")

    assert exc_info.value.status_code == 409
