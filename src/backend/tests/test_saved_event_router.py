"""API-level tests for the planned bookmark endpoints on `app.routers.events`.

TDD placeholders for endpoints agreed in the design plan:

    GET    /api/events/{event_id}/saved-status  -> SavedEventStatusOut{saved: bool}
    POST   /api/events/{event_id}/save           -> SaveEventResponseOut{saved, already_saved}
    DELETE /api/events/{event_id}/save            -> RemoveSavedEventResponseOut{removed: bool}

These will 404 (route not registered) or fail to patch `saved_event_service`
until the endpoints and service module described in the plan are implemented.
"""

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.routers.events import router as events_router
from app.schemas.event import EventOut

EVENT_ID = "11111111-1111-1111-1111-111111111111"
STUDENT_ID = "22222222-2222-2222-2222-222222222222"


def _build_app():
    app = FastAPI()
    app.include_router(events_router)
    return app


class _FakeSupabaseUser:
    def __init__(self, user_id: str):
        self.id = user_id


@pytest.fixture
def client():
    app = _build_app()
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def logged_in_client():
    app = _build_app()
    app.dependency_overrides[get_current_user] = lambda: _FakeSupabaseUser(STUDENT_ID)
    yield TestClient(app)
    app.dependency_overrides.clear()


def _fake_event():
    return EventOut(
        event_id=EVENT_ID,
        title="Sample Event",
        capacity=100,
        event_status="published",
        approval_status="approved",
    )


@patch("app.services.saved_event_service.list_saved_events")
def test_list_saved_events(mock_list_saved, logged_in_client):
    mock_list_saved.return_value = [
        {
            "event_id": EVENT_ID,
            "student_id": STUDENT_ID,
            "saved_at": "2026-08-02T10:00:00+00:00",
            "events": _fake_event().model_dump(mode="json"),
        }
    ]

    response = logged_in_client.get("/api/events/saved")

    assert response.status_code == 200
    assert response.json()[0]["event_id"] == EVENT_ID
    mock_list_saved.assert_called_once_with(STUDENT_ID)


# --- TC08: unauthenticated save request must be rejected --------------------
def test_save_event_requires_authentication(client):
    response = client.post(f"/api/events/{EVENT_ID}/save")
    assert response.status_code == 401


# --- TC07: saving a non-existent event returns 404 ---------------------------
@patch("app.services.event_service.get_event_by_id")
def test_save_event_404_when_event_missing(mock_get_event, logged_in_client):
    mock_get_event.return_value = None

    response = logged_in_client.post(f"/api/events/{EVENT_ID}/save")

    assert response.status_code == 404


# --- TC01: first-time save ----------------------------------------------------
@patch("app.services.saved_event_service.save_event")
@patch("app.services.event_service.get_event_by_id")
def test_save_event_first_time(mock_get_event, mock_save_event, logged_in_client):
    mock_get_event.return_value = _fake_event()
    mock_save_event.return_value = False  # False = newly created (mirrors register_user)

    response = logged_in_client.post(f"/api/events/{EVENT_ID}/save")

    assert response.status_code == 200
    body = response.json()
    assert body["saved"] is True
    assert body["already_saved"] is False
    mock_save_event.assert_called_once_with(EVENT_ID, STUDENT_ID)


# --- TC02: saving again is idempotent -----------------------------------------
@patch("app.services.saved_event_service.save_event")
@patch("app.services.event_service.get_event_by_id")
def test_save_event_already_saved(mock_get_event, mock_save_event, logged_in_client):
    mock_get_event.return_value = _fake_event()
    mock_save_event.return_value = True

    response = logged_in_client.post(f"/api/events/{EVENT_ID}/save")

    assert response.status_code == 200
    body = response.json()
    assert body["already_saved"] is True


# --- TC03: unsave an existing bookmark -----------------------------------------
@patch("app.services.saved_event_service.remove_saved_event")
def test_remove_saved_event(mock_remove, logged_in_client):
    mock_remove.return_value = True

    response = logged_in_client.delete(f"/api/events/{EVENT_ID}/save")

    assert response.status_code == 200
    assert response.json()["removed"] is True
    mock_remove.assert_called_once_with(EVENT_ID, STUDENT_ID)


# --- TC04: unsave a bookmark that was never saved (no-op) ----------------------
@patch("app.services.saved_event_service.remove_saved_event")
def test_remove_saved_event_noop_when_missing(mock_remove, logged_in_client):
    mock_remove.return_value = False

    response = logged_in_client.delete(f"/api/events/{EVENT_ID}/save")

    assert response.status_code == 200
    assert response.json()["removed"] is False


# --- TC05 / TC06: saved-status reflects current state ---------------------------
@pytest.mark.parametrize("saved_value", [True, False])
@patch("app.services.saved_event_service.is_event_saved")
@patch("app.services.event_service.get_event_by_id")
def test_saved_status_reflects_state(
    mock_get_event, mock_is_saved, saved_value, logged_in_client
):
    mock_get_event.return_value = _fake_event()
    mock_is_saved.return_value = saved_value

    response = logged_in_client.get(f"/api/events/{EVENT_ID}/saved-status")

    assert response.status_code == 200
    assert response.json()["saved"] is saved_value


# --- saved-status for an anonymous caller must not error, just report false ----
@patch("app.services.event_service.get_event_by_id")
def test_saved_status_anonymous_defaults_to_false(mock_get_event, client):
    mock_get_event.return_value = _fake_event()

    response = client.get(f"/api/events/{EVENT_ID}/saved-status")

    assert response.status_code == 200
    assert response.json()["saved"] is False
