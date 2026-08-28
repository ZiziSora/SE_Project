from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.routers.notifications import router


USER_ID = "22222222-2222-2222-2222-222222222222"
NOTIFICATION_ID = "44444444-4444-4444-4444-444444444444"


class _User:
    id = USER_ID


def _client(authenticated: bool = True) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: _User()
    return TestClient(app)


def test_notification_list_requires_authentication():
    response = _client(authenticated=False).get("/api/notifications")

    assert response.status_code == 401


@patch("app.routers.notifications.notification_service.list_notifications")
def test_notification_list_uses_current_user(mock_list):
    mock_list.return_value = {
        "items": [],
        "total": 0,
        "page": 1,
        "page_size": 20,
        "total_pages": 0,
    }

    response = _client().get("/api/notifications")

    assert response.status_code == 200
    mock_list.assert_called_once_with(USER_ID, page=1, page_size=20)


@patch("app.routers.notifications.notification_service.mark_notification_read")
def test_mark_read_uses_current_user(mock_mark_read):
    mock_mark_read.return_value = {
        "notification_id": NOTIFICATION_ID,
        "user_id": USER_ID,
        "event_id": None,
        "title": "Thông báo",
        "type": "EVENT_UPDATED",
        "is_read": True,
        "created_at": "2026-08-19T10:00:00+00:00",
        "content": "Nội dung",
    }

    response = _client().patch(
        f"/api/notifications/{NOTIFICATION_ID}/read"
    )

    assert response.status_code == 200
    mock_mark_read.assert_called_once_with(NOTIFICATION_ID, USER_ID)
