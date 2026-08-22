from unittest.mock import MagicMock, patch

from app.models.enum import NotificationType
from app.schemas.organizer_event import EventStatus, EventUpdate
from app.services import event_service, registration_service


EVENT_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "22222222-2222-2222-2222-222222222222"
ORGANIZER_ID = "33333333-3333-3333-3333-333333333333"


def _query(data):
    chain = MagicMock()
    for method in ("select", "eq", "maybe_single", "insert", "update"):
        getattr(chain, method).return_value = chain
    chain.execute.return_value = MagicMock(data=data, count=1)
    return chain


@patch("app.services.registration_service.notification_service.create_notification")
@patch("app.services.registration_service.get_supabase")
def test_successful_registration_creates_confirmation_notification(
    mock_get_supabase,
    mock_create_notification,
):
    query = _query([])
    query.maybe_single.return_value.execute.return_value = MagicMock(data=None)
    mock_get_supabase.return_value.table.return_value = query

    already_registered = registration_service.register_user(
        EVENT_ID,
        USER_ID,
        "Hội thảo AI",
    )

    assert already_registered is False
    mock_create_notification.assert_called_once_with(
        user_id=USER_ID,
        event_id=EVENT_ID,
        notification_type=NotificationType.REGISTRATION_CONFIRMED,
        title="Đăng ký sự kiện thành công",
        content='Bạn đã đăng ký thành công sự kiện "Hội thảo AI".',
    )


def _current_event():
    return {
        "event_id": EVENT_ID,
        "title": "Hội thảo AI",
        "location": "Hội trường A",
        "event_status": "PUBLISHED",
        "approval_status": "APPROVED",
        "capacity": 100,
    }


@patch("app.services.event_service.notification_service.notify_event_participants")
@patch("app.services.event_service._validate_capacity_against_registrations")
@patch("app.services.event_service._registration_counts", return_value={})
@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service._get_raw")
@patch("app.services.event_service.get_supabase")
def test_location_change_notifies_registered_students(
    mock_get_supabase,
    mock_get_raw,
    _categories,
    _counts,
    _capacity,
    mock_notify,
):
    current = _current_event()
    mock_get_raw.return_value = current
    mock_get_supabase.return_value.table.return_value = _query(
        [{**current, "location": "Hội trường B"}]
    )

    event_service.update_event(
        EVENT_ID,
        EventUpdate(location="Hội trường B"),
        ORGANIZER_ID,
    )

    mock_notify.assert_called_once()
    assert (
        mock_notify.call_args.kwargs["notification_type"]
        == NotificationType.EVENT_LOCATION_CHANGED
    )


@patch("app.services.event_service.notification_service.notify_event_participants")
@patch("app.services.event_service._validate_capacity_against_registrations")
@patch("app.services.event_service._registration_counts", return_value={})
@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service._get_raw")
@patch("app.services.event_service.get_supabase")
def test_event_cancellation_notifies_registered_students(
    mock_get_supabase,
    mock_get_raw,
    _categories,
    _counts,
    _capacity,
    mock_notify,
):
    current = _current_event()
    mock_get_raw.return_value = current
    mock_get_supabase.return_value.table.return_value = _query(
        [{**current, "event_status": "CANCELLED"}]
    )

    event_service.update_event(
        EVENT_ID,
        EventUpdate(event_status=EventStatus.CANCELLED),
        ORGANIZER_ID,
    )

    mock_notify.assert_called_once()
    assert (
        mock_notify.call_args.kwargs["notification_type"]
        == NotificationType.EVENT_CANCELLED
    )
