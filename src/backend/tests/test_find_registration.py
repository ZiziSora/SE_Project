from unittest.mock import MagicMock

from app.services.registration_service import find_registration, is_user_registered


def test_find_registration_limit_1(mocker):
    mock_supabase = MagicMock()
    query_mock = MagicMock()
    mock_supabase.table.return_value = query_mock
    query_mock.select.return_value = query_mock
    query_mock.eq.return_value = query_mock
    query_mock.neq.return_value = query_mock
    query_mock.order.return_value = query_mock
    query_mock.limit.return_value = query_mock

    # Mock response returning a list of 1 element
    mock_response = MagicMock()
    mock_response.data = [{"registration_id": "reg-123", "registration_status": "REGISTERED"}]
    query_mock.execute.return_value = mock_response

    mocker.patch("app.services.registration_service.get_supabase", return_value=mock_supabase)

    result = find_registration("event-1", "user-1", include_cancelled=True)

    assert result is not None
    assert result["registration_id"] == "reg-123"
    assert result["registration_status"] == "REGISTERED"
    query_mock.limit.assert_called_once_with(1)
    query_mock.order.assert_called_once_with("created_at", desc=True)
