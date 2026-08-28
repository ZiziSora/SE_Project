from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.enum import NotificationType
from app.services import notification_service


USER_ID = "22222222-2222-2222-2222-222222222222"
OTHER_USER_ID = "33333333-3333-3333-3333-333333333333"
EVENT_ID = "11111111-1111-1111-1111-111111111111"
NOTIFICATION_ID = "44444444-4444-4444-4444-444444444444"


def test_waitlist_notification_types_are_reserved_for_future_flows():
    assert NotificationType.WAITLIST_JOINED.name == "WAITLIST_JOINED"
    assert NotificationType.WAITLIST_PROMOTED.name == "WAITLIST_PROMOTED"


def _chain(data=None, count=None):
    query = MagicMock()
    for method in (
        "select",
        "eq",
        "order",
        "range",
        "limit",
        "maybe_single",
        "update",
        "insert",
        "in_",
    ):
        getattr(query, method).return_value = query
    query.execute.return_value = SimpleNamespace(data=data, count=count)
    return query


@patch("app.services.notification_service.get_supabase")
def test_list_notifications_is_scoped_and_paginated(mock_get_supabase):
    query = _chain(
        data=[
            {
                "noti_id": NOTIFICATION_ID,
                "user_id": USER_ID,
                "event_id": EVENT_ID,
                "title": "Nhắc lịch",
                "type": "EVENT_REMINDER",
                "is_read": False,
                "created_at": "2026-08-19T10:00:00+00:00",
                "content": "Sự kiện sắp bắt đầu.",
            }
        ],
        count=1,
    )
    mock_get_supabase.return_value.table.return_value = query

    result = notification_service.list_notifications(USER_ID, page=1, page_size=10)

    assert result["total"] == 1
    assert result["items"][0]["notification_id"] == NOTIFICATION_ID
    query.eq.assert_any_call("user_id", USER_ID)
    query.range.assert_called_once_with(0, 9)


@patch("app.services.notification_service.get_supabase")
def test_get_notification_rejects_a_notification_owned_by_another_user(
    mock_get_supabase,
):
    query = _chain(data=None)
    mock_get_supabase.return_value.table.return_value = query

    with pytest.raises(HTTPException) as exc_info:
        notification_service.get_notification(NOTIFICATION_ID, OTHER_USER_ID)

    assert exc_info.value.status_code == 404
    query.eq.assert_any_call("noti_id", NOTIFICATION_ID)
    query.eq.assert_any_call("user_id", OTHER_USER_ID)


@patch("app.services.notification_service.get_supabase")
def test_mark_notification_read_updates_only_the_owner_row(mock_get_supabase):
    row = {
        "noti_id": NOTIFICATION_ID,
        "user_id": USER_ID,
        "event_id": EVENT_ID,
        "title": "Đổi địa điểm",
        "type": "EVENT_LOCATION_CHANGED",
        "is_read": True,
        "created_at": "2026-08-19T10:00:00+00:00",
        "content": "Địa điểm mới: Hội trường B.",
    }
    query = _chain(data=[row])
    mock_get_supabase.return_value.table.return_value = query

    result = notification_service.mark_notification_read(
        NOTIFICATION_ID, USER_ID
    )

    assert result["is_read"] is True
    query.update.assert_called_once_with({"is_read": True})
    query.eq.assert_any_call("noti_id", NOTIFICATION_ID)
    query.eq.assert_any_call("user_id", USER_ID)


@patch("app.services.notification_service.get_supabase")
def test_create_notification_writes_uppercase_database_enum(mock_get_supabase):
    query = _chain(data=[])
    mock_get_supabase.return_value.table.return_value = query

    notification_service.create_notification(
        user_id=USER_ID,
        event_id=EVENT_ID,
        notification_type=NotificationType.WAITLIST_JOINED,
        title="Đã vào danh sách chờ",
        content="Bạn đã được thêm vào danh sách chờ.",
    )

    payload = query.insert.call_args.args[0]
    assert payload["type"] == "WAITLIST_JOINED"
    assert payload["is_read"] is False
