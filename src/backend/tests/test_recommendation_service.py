"""Unit tests for app.services.recommendation_service.

ANTHROPIC_API_KEY is unset in the test environment (see conftest.py), so
`_rerank_with_llm` short-circuits before making any network call — every
test here exercises the rule-based path, which must keep working with no
API key configured (see module docstring in recommendation_service.py).
"""
from unittest.mock import patch

from app.services import recommendation_service as svc

EVENT_A = "event-a"
EVENT_B = "event-b"
STUDENT_ID = "student-1"
ORGANIZER_ID = "organizer-1"


class _FakeQuery:
    """Minimal chainable stand-in for a Supabase postgrest query builder.

    `raw` is either a plain list (single query shape for that table) or a
    dict {"plain": [...], "with_events": [...]} when the same table is
    queried with two different `select()` shapes in the service — routed by
    whether the requested fields embed the related `events(...)` table.
    """

    def __init__(self, raw):
        self._raw = raw
        self._data = raw if isinstance(raw, list) else []

    def select(self, fields="*", **_kw):
        if isinstance(self._raw, dict):
            self._data = self._raw["with_events"] if "events(" in fields else self._raw["plain"]
        else:
            self._data = self._raw
        return self

    def eq(self, *_a, **_kw):
        return self

    def in_(self, *_a, **_kw):
        return self

    def gte(self, *_a, **_kw):
        return self

    def maybe_single(self, *_a, **_kw):
        self._data = self._data[0] if self._data else None
        return self

    def execute(self):
        return type("Res", (), {"data": self._data})()


class _FakeSupabase:
    def __init__(self, tables: dict):
        self._tables = tables

    def table(self, name):
        return _FakeQuery(self._tables.get(name, []))


def _events():
    return [
        {
            "event_id": EVENT_A,
            "organizer_id": ORGANIZER_ID,
            "category_id": 1,
            "title": "Hội thảo kỹ năng mềm",
            "description": "Kỹ năng thuyết trình",
            "start_time": "2026-09-01T09:00:00",
            "end_time": "2026-09-01T11:00:00",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
        },
        {
            "event_id": EVENT_B,
            "organizer_id": ORGANIZER_ID,
            "category_id": 2,
            "title": "Ngày hội việc làm",
            "description": "Tuyển dụng thực tập sinh",
            "start_time": "2026-09-05T09:00:00",
            "end_time": "2026-09-05T11:00:00",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
        },
    ]


def _tables(*, registration_counts=None, registration_signals=None, saved_signals=None, student_department=None):
    return {
        "events": _events(),
        "event_categories": [
            {"category_id": 1, "name": "Kỹ năng mềm"},
            {"category_id": 2, "name": "Việc làm"},
        ],
        "event_registrations": {
            "plain": registration_counts or [],
            "with_events": registration_signals or [],
        },
        "saved_events": saved_signals or [],
        "users": [{"user_id": STUDENT_ID, "department_name": student_department}],
    }


@patch("app.services.recommendation_service.get_supabase")
def test_cold_start_falls_back_to_trending_without_personalization(mock_get_supabase):
    """No student_id (anonymous) -> pure popularity ranking, no AI call."""
    tables = _tables(
        registration_counts=[
            {"event_id": EVENT_B, "registration_status": "REGISTERED"},
            {"event_id": EVENT_B, "registration_status": "REGISTERED"},
        ]
    )
    mock_get_supabase.return_value = _FakeSupabase(tables)

    result = svc.get_recommendations_service(student_id=None, limit=6)

    assert result.personalized is False
    assert [r.event_id for r in result.recommendations][0] == EVENT_B
    assert result.recommendations[0].reason == "Sự kiện đang được quan tâm nhiều"


@patch("app.services.recommendation_service.get_supabase")
def test_history_boosts_matching_category_over_popularity(mock_get_supabase):
    """Student's past registration in category 1 should outrank a more
    popular event in a category they have no history with."""
    tables = _tables(
        registration_counts=[
            {"event_id": EVENT_B, "registration_status": "REGISTERED"},
            {"event_id": EVENT_B, "registration_status": "REGISTERED"},
            {"event_id": EVENT_B, "registration_status": "REGISTERED"},
        ],
        registration_signals=[
            {
                "event_id": "past-event",
                "registration_status": "REGISTERED",
                "events": {"category_id": 1},
            }
        ],
    )
    mock_get_supabase.return_value = _FakeSupabase(tables)

    result = svc.get_recommendations_service(student_id=STUDENT_ID, limit=6)

    assert result.personalized is True
    assert [r.event_id for r in result.recommendations][0] == EVENT_A


@patch("app.services.recommendation_service.get_supabase")
def test_already_registered_events_are_excluded(mock_get_supabase):
    tables = _tables(
        registration_signals=[
            {
                "event_id": EVENT_A,
                "registration_status": "REGISTERED",
                "events": {"category_id": 1},
            }
        ],
    )
    mock_get_supabase.return_value = _FakeSupabase(tables)

    result = svc.get_recommendations_service(student_id=STUDENT_ID, limit=6)

    assert EVENT_A not in [r.event_id for r in result.recommendations]


@patch("app.services.recommendation_service.get_supabase")
def test_cancelled_registration_does_not_boost_category(mock_get_supabase):
    """A cancelled registration is not a positive interest signal."""
    tables = _tables(
        registration_signals=[
            {
                "event_id": "past-event",
                "registration_status": "CANCELLED",
                "events": {"category_id": 1},
            }
        ],
    )
    mock_get_supabase.return_value = _FakeSupabase(tables)

    result = svc.get_recommendations_service(student_id=STUDENT_ID, limit=6)

    assert result.personalized is False
