from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.auth import require_admin
from app.database import get_db
from app.routers.event_review import router


class _Admin:
    user_id = "33333333-3333-3333-3333-333333333333"


def _override_db():
    yield object()


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_admin] = _Admin
    app.dependency_overrides[get_db] = _override_db
    return TestClient(app)


@patch("app.routers.event_review.list_pending_events")
def test_list_pending_events_is_available_to_admin(mock_list_pending_events):
    mock_list_pending_events.return_value = {"items": [], "total": 0}
    client = _build_client()

    response = client.get("/api/admin/review-events")

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}
    mock_list_pending_events.assert_called_once()


@patch("app.routers.event_review.approve_event")
def test_accept_event_calls_approval_service(mock_approve_event):
    mock_approve_event.return_value = {
        "event_id": "11111111-1111-1111-1111-111111111111",
        "approval_status": "approved",
        "event_status": "published",
    }
    client = _build_client()

    response = client.patch(
        "/api/admin/review-events/11111111-1111-1111-1111-111111111111/accept"
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Đã chấp nhận và xuất bản sự kiện."
    assert response.json()["event"]["approval_status"] == "approved"
    mock_approve_event.assert_called_once()


@patch("app.routers.event_review.reject_event")
def test_reject_event_calls_rejection_service(mock_reject_event):
    mock_reject_event.return_value = {
        "event_id": "11111111-1111-1111-1111-111111111111",
        "approval_status": "rejected",
        "event_status": "draft",
    }
    client = _build_client()

    response = client.patch(
        "/api/admin/review-events/11111111-1111-1111-1111-111111111111/reject"
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Đã từ chối sự kiện."
    assert response.json()["event"]["approval_status"] == "rejected"
    mock_reject_event.assert_called_once()
