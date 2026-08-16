"""Tests for the public ongoing-event list used by the Student explore page."""

from datetime import timedelta
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.events import router as events_router
from app.schemas.event import EventOut
from app.services import event_service


EVENT_ID = "11111111-1111-1111-1111-111111111111"


class _FakeQuery:
    def __init__(self, rows):
        self.rows = rows
        self.conditions: list[tuple[str, str, object]] = []
        self.ordering: tuple[str, bool] | None = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self.conditions.append(("eq", column, value))
        return self

    def lte(self, column, value):
        self.conditions.append(("lte", column, value))
        return self

    def gte(self, column, value):
        self.conditions.append(("gte", column, value))
        return self

    def order(self, column, desc=False):
        self.ordering = (column, desc)
        return self

    def execute(self):
        return MagicMock(data=self.rows)


@patch("app.services.event_service._category_map", return_value={1: "Học thuật"})
@patch("app.services.event_service.get_supabase")
def test_list_ongoing_events_filters_public_events_by_current_time(
    mock_get_supabase,
    _mock_categories,
):
    now = event_service._now_naive_utc()
    row = {
        "event_id": EVENT_ID,
        "category_id": 1,
        "title": "Hội thảo AI",
        "start_time": (now - timedelta(hours=1)).isoformat(),
        "end_time": (now + timedelta(hours=1)).isoformat(),
        "event_status": "PUBLISHED",
        "approval_status": "APPROVED",
    }
    query = _FakeQuery([row])
    mock_get_supabase.return_value.table.return_value = query

    result = event_service.list_ongoing_events()

    assert len(result) == 1
    assert result[0].event_id == EVENT_ID
    assert result[0].category_name == "Học thuật"
    assert result[0].event_status == "ONGOING"
    assert ("eq", "event_status", "PUBLISHED") in query.conditions
    assert ("eq", "approval_status", "APPROVED") in query.conditions
    assert any(item[:2] == ("lte", "start_time") for item in query.conditions)
    assert any(item[:2] == ("gte", "end_time") for item in query.conditions)
    assert query.ordering == ("end_time", False)


def test_get_ongoing_events_route_returns_public_list():
    app = FastAPI()
    app.include_router(events_router)
    client = TestClient(app)
    event = EventOut(
        event_id=EVENT_ID,
        title="Hội thảo AI",
        event_status="ONGOING",
        approval_status="APPROVED",
    )

    with patch(
        "app.services.event_service.list_ongoing_events",
        return_value=[event],
    ) as mock_list:
        response = client.get("/api/events/ongoing")

    assert response.status_code == 200
    assert response.json()[0]["event_id"] == EVENT_ID
    assert response.json()[0]["event_status"] == "ONGOING"
    mock_list.assert_called_once_with()
