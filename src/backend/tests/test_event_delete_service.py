"""Xoá sự kiện: dọn sạch dữ liệu con, nhưng giữ lại thông báo của sinh viên."""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.services import event_service


EVENT_ID = "11111111-1111-1111-1111-111111111111"
ORGANIZER_ID = "33333333-3333-3333-3333-333333333333"
REGISTRATION_ID = "22222222-2222-2222-2222-222222222222"


class FakeTable:
    """Ghi lại thao tác trên từng bảng để test kiểm tra thứ tự và kiểu lệnh."""

    def __init__(self, name: str, calls: list, rows: dict):
        self.name = name
        self.calls = calls
        self.rows = rows
        self.operation = None
        self.payload = None

    def select(self, *_args, **_kwargs):
        self.operation = "select"
        return self

    def delete(self):
        self.operation = "delete"
        self.calls.append((self.name, "delete", None))
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = payload
        self.calls.append((self.name, "update", payload))
        return self

    def eq(self, *_args):
        return self

    def in_(self, *_args):
        return self

    def execute(self):
        return MagicMock(data=self.rows.get(self.name, []), count=0)


def _supabase(calls: list, rows: dict | None = None):
    client = MagicMock()
    client.table.side_effect = lambda name: FakeTable(name, calls, rows or {})
    return client


def _event(event_status="CANCELLED", approval_status="APPROVED"):
    return {
        "event_id": EVENT_ID,
        "title": "Ngày Chủ nhật Xanh 2026",
        "event_status": event_status,
        "approval_status": approval_status,
    }


@patch("app.services.event_service._get_raw")
@patch("app.services.event_service.get_supabase")
def test_delete_cancelled_event_clears_children_and_keeps_notifications(
    mock_get_supabase,
    mock_get_raw,
):
    calls: list = []
    mock_get_raw.return_value = _event()
    mock_get_supabase.return_value = _supabase(
        calls,
        {"event_registrations": [{"registration_id": REGISTRATION_ID}]},
    )

    event_service.delete_event(EVENT_ID, ORGANIZER_ID)

    deleted_tables = [name for name, operation, _ in calls if operation == "delete"]
    assert deleted_tables == [
        "event_checkin_qr",
        "event_registrations",
        "saved_events",
        "waiting_list",
        "event_revisions",
        "events",
    ], "phải xoá dữ liệu con trước, và sự kiện sau cùng"

    # Thông báo chỉ bị gỡ liên kết, không bị xoá khỏi hộp thư sinh viên.
    assert ("notifications", "update", {"event_id": None}) in calls
    assert "notifications" not in deleted_tables


@patch("app.services.event_service._get_raw")
@patch("app.services.event_service.get_supabase")
def test_delete_skips_checkin_qr_when_event_has_no_registration(
    mock_get_supabase,
    mock_get_raw,
):
    calls: list = []
    mock_get_raw.return_value = _event(event_status="DRAFT", approval_status="PENDING")
    mock_get_supabase.return_value = _supabase(calls)

    event_service.delete_event(EVENT_ID, ORGANIZER_ID)

    assert ("event_checkin_qr", "delete", None) not in calls


@patch("app.services.event_service._get_raw")
@patch("app.services.event_service.get_supabase")
def test_delete_ongoing_event_is_rejected_before_touching_data(
    mock_get_supabase,
    mock_get_raw,
):
    calls: list = []
    mock_get_raw.return_value = {
        **_event(event_status="PUBLISHED"),
        "start_time": "2000-01-01T00:00:00",
        "end_time": "2999-01-01T00:00:00",
    }
    mock_get_supabase.return_value = _supabase(calls)

    with pytest.raises(HTTPException) as exc_info:
        event_service.delete_event(EVENT_ID, ORGANIZER_ID)

    assert exc_info.value.status_code == 409
    assert calls == []
