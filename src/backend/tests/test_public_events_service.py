"""Regression tests for the public event discovery and detail queries."""

from unittest.mock import MagicMock, call, patch

from app.services import event_service
from app.services.event_services import get_filtered_events_service


EVENT_ID = "11111111-1111-1111-1111-111111111111"


def _query_client(rows):
    query = MagicMock()
    for method in ("select", "eq", "ilike", "in_", "limit"):
        getattr(query, method).return_value = query
    query.execute.return_value = MagicMock(data=rows)

    client = MagicMock()
    client.table.return_value = query
    return client, query


@patch("app.services.event_services.supabase")
def test_explore_list_only_queries_approved_published_events(mock_supabase):
    client, query = _query_client([])
    mock_supabase.table.side_effect = client.table.side_effect
    mock_supabase.table.return_value = query

    result = get_filtered_events_service()

    assert result["events"] == []
    assert query.eq.call_args_list[:2] == [
        call("event_status", "PUBLISHED"),
        call("approval_status", "APPROVED"),
    ]


@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service.get_supabase")
def test_public_event_detail_only_queries_approved_published_event(
    mock_get_supabase,
    _mock_categories,
):
    client, query = _query_client(
        [
            {
                "event_id": EVENT_ID,
                "title": "Sự kiện công khai",
                "event_status": "PUBLISHED",
                "approval_status": "APPROVED",
            }
        ]
    )
    mock_get_supabase.return_value = client

    result = event_service.get_event_by_id(EVENT_ID)

    assert result is not None
    assert query.eq.call_args_list == [
        call("event_id", EVENT_ID),
        call("event_status", "PUBLISHED"),
        call("approval_status", "APPROVED"),
    ]
