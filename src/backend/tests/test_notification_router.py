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


@patch(
    "app.routers.notifications.notification_service.sync_pending_event_reviews_for_admin"
)
def test_sync_pending_reviews_uses_current_admin_id(mock_sync):
    mock_sync.return_value = 3

    response = _client().post("/api/notifications/sync-pending-reviews")

    assert response.status_code == 200
    assert response.json() == {"created_count": 3}
    mock_sync.assert_called_once_with(USER_ID)


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


@patch("app.routers.notifications.notification_service.delete_notification")
def test_delete_notification_uses_current_user(mock_delete):
    mock_delete.return_value = {"deleted_count": 1}

    response = _client().delete(
        f"/api/notifications/{NOTIFICATION_ID}"
    )

    assert response.status_code == 200
    assert response.json() == {"deleted_count": 1}
    mock_delete.assert_called_once_with(NOTIFICATION_ID, USER_ID)


@patch("app.routers.notifications.notification_service.delete_notifications")
def test_delete_many_notifications_uses_current_user(mock_delete_many):
    second_notification_id = "66666666-6666-6666-6666-666666666666"
    mock_delete_many.return_value = {"deleted_count": 2}

    response = _client().request(
        "DELETE",
        "/api/notifications",
        json={
            "notification_ids": [NOTIFICATION_ID, second_notification_id],
        },
    )

    assert response.status_code == 200
    assert response.json() == {"deleted_count": 2}
    mock_delete_many.assert_called_once_with(
        [NOTIFICATION_ID, second_notification_id],
        USER_ID,
    )
