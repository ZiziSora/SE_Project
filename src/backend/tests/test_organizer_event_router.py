from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.auth import require_approved_organizer
from app.routers.organizer_events import router
from app.schemas.organizer_event import OrganizerEventOut

EVENT_ID = "11111111-1111-1111-1111-111111111111"
ORGANIZER_ID = "22222222-2222-2222-2222-222222222222"


class _Organizer:
    user_id = ORGANIZER_ID


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_approved_organizer] = _Organizer
    return TestClient(app)


@patch("app.services.event_service.get_event")
def test_get_event_uses_canonical_path_and_current_organizer(mock_get_event):
    mock_get_event.return_value = OrganizerEventOut(
        event_id=EVENT_ID,
        title="Sự kiện mẫu",
    )
    client = _build_client()

    response = client.get(f"/api/organizer/events/{EVENT_ID}")

    assert response.status_code == 200
    mock_get_event.assert_called_once_with(EVENT_ID, ORGANIZER_ID)


def test_legacy_organizer_events_path_is_not_registered():
    client = _build_client()

    response = client.get(f"/api/organizer_events/{EVENT_ID}")

    assert response.status_code == 404


@patch("app.services.event_service.list_events")
def test_list_events_is_scoped_to_current_organizer(mock_list_events):
    mock_list_events.return_value = {
        "items": [],
        "total": 0,
        "page": 1,
        "page_size": 5,
        "total_pages": 1,
    }
    client = _build_client()

    response = client.get("/api/organizer/events")

    assert response.status_code == 200
    assert mock_list_events.call_args.kwargs["organizer_id"] == ORGANIZER_ID


@patch("app.services.event_service.create_event")
def test_create_event_ignores_client_organizer_id(mock_create_event):
    mock_create_event.return_value = OrganizerEventOut(
        event_id=EVENT_ID,
        title="Bản nháp",
    )
    client = _build_client()

    response = client.post(
        "/api/organizer/events",
        json={
            "title": "Bản nháp",
            "event_status": "DRAFT",
            "organizer_id": "33333333-3333-3333-3333-333333333333",
        },
    )

    assert response.status_code == 201
    payload, organizer_id = mock_create_event.call_args.args
    assert not hasattr(payload, "organizer_id")
    assert organizer_id == ORGANIZER_ID
