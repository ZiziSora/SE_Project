"""Unit tests for the planned `app.services.saved_event_service` module.

Written TDD-style against the interface agreed in the design plan (mirrors
`app.services.registration_service`, which uses the raw Supabase client
rather than the SQLAlchemy ORM). These tests will fail with an ImportError
until `app/services/saved_event_service.py` is implemented with the
following functions:

    find_saved(event_id: str, student_id: str) -> dict | None
    is_event_saved(event_id: str, student_id: str) -> bool
    save_event(event_id: str, student_id: str) -> bool          # True = already saved (no-op)
    remove_saved_event(event_id: str, student_id: str) -> bool  # True = a row was removed
    list_saved_events(student_id: str) -> list[dict]
"""

from unittest.mock import MagicMock, patch

import pytest

pytest.importorskip(
    "app.services.saved_event_service",
    reason="saved_event_service not implemented yet (TDD placeholder)",
)

from app.services import saved_event_service as svc  # noqa: E402

EVENT_ID = "11111111-1111-1111-1111-111111111111"
STUDENT_ID = "22222222-2222-2222-2222-222222222222"


def _mock_supabase_select(return_data):
    """Build a mock Supabase client whose select().eq().eq().maybe_single().execute()
    chain returns an object with `.data = return_data`.
    """
    supabase = MagicMock()
    execute_result = MagicMock(data=return_data)
    (
        supabase.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute
    ).return_value = execute_result
    return supabase


@patch("app.services.saved_event_service.get_supabase")
def test_find_saved_returns_row_when_exists(mock_get_supabase):
    row = {"event_id": EVENT_ID, "student_id": STUDENT_ID, "saved_at": "2026-08-02T00:00:00"}
    mock_get_supabase.return_value = _mock_supabase_select(row)

    result = svc.find_saved(EVENT_ID, STUDENT_ID)

    assert result == row


@patch("app.services.saved_event_service.get_supabase")
def test_find_saved_returns_none_when_missing(mock_get_supabase):
    mock_get_supabase.return_value = _mock_supabase_select(None)

    assert svc.find_saved(EVENT_ID, STUDENT_ID) is None


@patch("app.services.saved_event_service.find_saved")
def test_is_event_saved_true(mock_find_saved):
    mock_find_saved.return_value = {"event_id": EVENT_ID, "student_id": STUDENT_ID}

    assert svc.is_event_saved(EVENT_ID, STUDENT_ID) is True


@patch("app.services.saved_event_service.find_saved")
def test_is_event_saved_false(mock_find_saved):
    mock_find_saved.return_value = None

    assert svc.is_event_saved(EVENT_ID, STUDENT_ID) is False


# --- TC01: first-time save -------------------------------------------------
@patch("app.services.saved_event_service.get_supabase")
@patch("app.services.saved_event_service.find_saved")
def test_save_event_creates_new_row_when_not_saved(mock_find_saved, mock_get_supabase):
    mock_find_saved.return_value = None
    supabase = MagicMock()
    mock_get_supabase.return_value = supabase

    already_saved = svc.save_event(EVENT_ID, STUDENT_ID)

    assert already_saved is False
    supabase.table.return_value.insert.assert_called_once()
    inserted_payload = supabase.table.return_value.insert.call_args[0][0]
    assert inserted_payload["event_id"] == EVENT_ID
    assert inserted_payload["student_id"] == STUDENT_ID
    supabase.table.return_value.insert.return_value.execute.assert_called_once()


# --- TC02: idempotent save (already bookmarked) -----------------------------
@patch("app.services.saved_event_service.get_supabase")
@patch("app.services.saved_event_service.find_saved")
def test_save_event_is_idempotent_when_already_saved(mock_find_saved, mock_get_supabase):
    mock_find_saved.return_value = {"event_id": EVENT_ID, "student_id": STUDENT_ID}
    supabase = MagicMock()
    mock_get_supabase.return_value = supabase

    already_saved = svc.save_event(EVENT_ID, STUDENT_ID)

    assert already_saved is True
    supabase.table.return_value.insert.assert_not_called()


# --- TC03: remove an existing bookmark --------------------------------------
@patch("app.services.saved_event_service.get_supabase")
@patch("app.services.saved_event_service.find_saved")
def test_remove_saved_event_deletes_existing_row(mock_find_saved, mock_get_supabase):
    mock_find_saved.return_value = {"event_id": EVENT_ID, "student_id": STUDENT_ID}
    supabase = MagicMock()
    mock_get_supabase.return_value = supabase

    removed = svc.remove_saved_event(EVENT_ID, STUDENT_ID)

    assert removed is True
    delete_chain = supabase.table.return_value.delete.return_value
    delete_chain.eq.assert_any_call("event_id", EVENT_ID)
    delete_chain.eq.return_value.eq.assert_any_call("student_id", STUDENT_ID)


# --- TC04: remove a bookmark that doesn't exist (no-op) ---------------------
@patch("app.services.saved_event_service.get_supabase")
@patch("app.services.saved_event_service.find_saved")
def test_remove_saved_event_is_noop_when_missing(mock_find_saved, mock_get_supabase):
    mock_find_saved.return_value = None
    supabase = MagicMock()
    mock_get_supabase.return_value = supabase

    removed = svc.remove_saved_event(EVENT_ID, STUDENT_ID)

    assert removed is False
    supabase.table.return_value.delete.assert_not_called()


# --- TC09: list a student's saved events ------------------------------------
@patch("app.services.saved_event_service.get_supabase")
def test_list_saved_events_returns_rows_for_student(mock_get_supabase):
    rows = [
        {
            "event_id": EVENT_ID,
            "student_id": STUDENT_ID,
            "saved_at": "2026-08-02T10:00:00",
            "events": {
                "event_id": EVENT_ID,
                "title": "Future Event",
                "start_time": "2029-01-01T00:00:00+00:00",
                "registration_deadline": "2028-12-31T23:59:59+00:00",
            },
        },
    ]
    supabase = MagicMock()
    execute_result = MagicMock(data=rows)
    (
        supabase.table.return_value
        .select.return_value
        .eq.return_value
        .order.return_value
        .execute
    ).return_value = execute_result
    mock_get_supabase.return_value = supabase

    result = svc.list_saved_events(STUDENT_ID)

    assert result == rows
    supabase.table.return_value.select.return_value.eq.assert_called_once_with(
        "student_id", STUDENT_ID
    )


@patch("app.services.saved_event_service.get_supabase")
def test_list_saved_events_filters_out_expired_events(mock_get_supabase):
    future_event = {
        "event_id": "future-1",
        "student_id": STUDENT_ID,
        "events": {
            "title": "Future Event",
            "start_time": "2029-01-01T00:00:00+00:00",
            "registration_deadline": "2028-12-31T23:59:59+00:00",
        },
    }
    expired_by_deadline = {
        "event_id": "expired-1",
        "student_id": STUDENT_ID,
        "events": {
            "title": "Expired Deadline Event",
            "start_time": "2029-01-01T00:00:00+00:00",
            "registration_deadline": "2020-01-01T00:00:00+00:00",
        },
    }
    expired_by_start_time = {
        "event_id": "expired-2",
        "student_id": STUDENT_ID,
        "events": {
            "title": "Expired Start Time Event",
            "start_time": "2020-01-01T00:00:00+00:00",
            "registration_deadline": None,
        },
    }
    deleted_event = {
        "event_id": "deleted-1",
        "student_id": STUDENT_ID,
        "events": None,
    }
    rows = [future_event, expired_by_deadline, expired_by_start_time, deleted_event]

    supabase = MagicMock()
    execute_result = MagicMock(data=rows)
    (
        supabase.table.return_value
        .select.return_value
        .eq.return_value
        .order.return_value
        .execute
    ).return_value = execute_result
    mock_get_supabase.return_value = supabase

    result = svc.list_saved_events(STUDENT_ID)

    assert len(result) == 1
    assert result[0]["event_id"] == "future-1"

