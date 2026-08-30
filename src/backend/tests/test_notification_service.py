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
ADMIN_ID = "55555555-5555-5555-5555-555555555555"


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
        "delete",
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
def test_delete_notification_deletes_only_the_owner_row(mock_get_supabase):
    query = _chain(data=[{"noti_id": NOTIFICATION_ID}])
    mock_get_supabase.return_value.table.return_value = query

    result = notification_service.delete_notification(
        NOTIFICATION_ID,
        USER_ID,
    )

    assert result == {"deleted_count": 1}
    query.delete.assert_called_once_with()
    query.eq.assert_any_call("noti_id", NOTIFICATION_ID)
    query.eq.assert_any_call("user_id", USER_ID)


@patch("app.services.notification_service.get_supabase")
def test_delete_notification_rejects_an_unowned_row(mock_get_supabase):
    query = _chain(data=[])
    mock_get_supabase.return_value.table.return_value = query

    with pytest.raises(HTTPException) as exc_info:
        notification_service.delete_notification(
            NOTIFICATION_ID,
            OTHER_USER_ID,
        )

    assert exc_info.value.status_code == 404


@patch("app.services.notification_service.get_supabase")
def test_delete_notifications_deletes_owned_rows_in_one_query(mock_get_supabase):
    second_notification_id = "66666666-6666-6666-6666-666666666666"
    query = _chain(
        data=[
            {"noti_id": NOTIFICATION_ID},
            {"noti_id": second_notification_id},
        ]
    )
    mock_get_supabase.return_value.table.return_value = query

    result = notification_service.delete_notifications(
        [NOTIFICATION_ID, second_notification_id, NOTIFICATION_ID],
        USER_ID,
    )

    assert result == {"deleted_count": 2}
    query.delete.assert_called_once_with()
    query.eq.assert_called_once_with("user_id", USER_ID)
    query.in_.assert_called_once_with(
        "noti_id",
        [NOTIFICATION_ID, second_notification_id],
    )


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


@patch("app.services.notification_service.create_notifications")
@patch("app.services.notification_service.get_supabase")
def test_notify_admins_about_pending_event_targets_active_admins(
    mock_get_supabase,
    mock_create_notifications,
):
    query = _chain(data=[{"user_id": ADMIN_ID}])
    mock_get_supabase.return_value.table.return_value = query
    mock_create_notifications.return_value = 1

    result = notification_service.notify_admins_event_pending(
        event_id=EVENT_ID,
        event_title="Hội thảo AI 2026",
    )

    assert result == 1
    mock_get_supabase.return_value.table.assert_called_once_with("users")
    query.select.assert_called_once_with("user_id")
    query.eq.assert_any_call("role", "admin")
    query.eq.assert_any_call("status", "active")
    mock_create_notifications.assert_called_once_with(
        user_ids=[ADMIN_ID],
        event_id=EVENT_ID,
        notification_type=NotificationType.NEW_EVENT,
        title="Sự kiện mới cần duyệt",
        content=(
            'Ban tổ chức đã gửi sự kiện “Hội thảo AI 2026” '
            "và đang chờ quản trị viên xét duyệt."
        ),
    )


@patch("app.services.notification_service.create_notification")
@patch("app.services.notification_service.get_supabase")
def test_sync_pending_reviews_creates_only_missing_admin_notifications(
    mock_get_supabase,
    mock_create_notification,
):
    admin_query = _chain(data={"user_id": ADMIN_ID})
    pending_query = _chain(
        data=[
            {"event_id": EVENT_ID, "title": "Hội thảo AI 2026"},
            {"event_id": OTHER_USER_ID, "title": "Workshop CV"},
        ]
    )
    existing_query = _chain(data=[{"event_id": OTHER_USER_ID}])
    mock_get_supabase.return_value.table.side_effect = [
        admin_query,
        pending_query,
        existing_query,
    ]

    result = notification_service.sync_pending_event_reviews_for_admin(ADMIN_ID)

    assert result == 1
    admin_query.eq.assert_any_call("user_id", ADMIN_ID)
    admin_query.eq.assert_any_call("role", "admin")
    admin_query.eq.assert_any_call("status", "active")
    pending_query.eq.assert_any_call("event_status", "DRAFT")
    pending_query.eq.assert_any_call("approval_status", "PENDING")
    existing_query.eq.assert_any_call("user_id", ADMIN_ID)
    existing_query.eq.assert_any_call("type", "NEW_EVENT")
    existing_query.in_.assert_called_once_with(
        "event_id", [EVENT_ID, OTHER_USER_ID]
    )
    mock_create_notification.assert_called_once_with(
        user_id=ADMIN_ID,
        event_id=EVENT_ID,
        notification_type=NotificationType.NEW_EVENT,
        title="Sự kiện mới cần duyệt",
        content=(
            'Ban tổ chức đã gửi sự kiện “Hội thảo AI 2026” '
            "và đang chờ quản trị viên xét duyệt."
        ),
    )


@patch("app.services.notification_service.create_notification")
@patch("app.services.notification_service.get_supabase")
def test_notify_admins_about_pending_organizer_request(
    mock_get_supabase,
    mock_create_notification,
):
    query = _chain(data=[{"user_id": ADMIN_ID}])
    mock_get_supabase.return_value.table.return_value = query

    result = notification_service.notify_admins_organizer_request_pending(
        organizer_name="Câu lạc bộ Tin học",
    )

    assert result == 1
    payload = mock_create_notification.call_args.kwargs
    assert payload["user_id"] == ADMIN_ID
    assert payload["event_id"] is None
    assert payload["notification_type"] == NotificationType.NEW_ORGANIZER_REQUEST
    assert payload["title"] == "Yêu cầu Ban tổ chức mới"
    assert "Câu lạc bộ Tin học" in payload["content"]
