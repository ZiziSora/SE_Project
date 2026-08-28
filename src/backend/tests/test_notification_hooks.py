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
