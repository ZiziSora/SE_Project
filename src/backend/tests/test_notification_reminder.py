from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.auth import require_approved_organizer
from app.routers.organizer_events import router


EVENT_ID = "11111111-1111-1111-1111-111111111111"
ORGANIZER_ID = "22222222-2222-2222-2222-222222222222"


class _Organizer:
    user_id = ORGANIZER_ID


def _client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_approved_organizer] = _Organizer
    return TestClient(app)


@patch("app.routers.organizer_events.notification_service.send_event_reminder")
def test_organizer_can_send_reminder_for_owned_event(mock_send):
    mock_send.return_value = {
        "message": "Đã tạo thông báo nhắc lịch.",
        "recipient_count": 3,
    }

    response = _client().post(
        f"/api/organizer/events/{EVENT_ID}/reminders",
        json={"content": "Sự kiện sẽ bắt đầu lúc 08:00 ngày mai."},
    )

    assert response.status_code == 201
    mock_send.assert_called_once_with(
        event_id=EVENT_ID,
        organizer_id=ORGANIZER_ID,
        title=None,
        content="Sự kiện sẽ bắt đầu lúc 08:00 ngày mai.",
    )
