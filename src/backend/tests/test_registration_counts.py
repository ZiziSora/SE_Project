"""Đếm số người đăng ký cho Ban tổ chức.

Lỗi gốc: `TABLE_REGISTRATIONS` trỏ vào bảng "registrations" không tồn tại
(bảng thật là "event_registrations"), còn `_registration_counts` lại nuốt
mọi lỗi truy vấn → Ban tổ chức luôn thấy "0/300" dù sinh viên đã đăng ký.
"""

from unittest.mock import MagicMock, patch

from app.core import config as core_config
from app.services import event_service, registration_service


EVENT_ID = "11111111-1111-1111-1111-111111111111"


def _counts_client(rows):
    query = MagicMock()
    for method in ("select", "in_", "eq", "neq"):
        getattr(query, method).return_value = query
    query.execute.return_value = MagicMock(data=rows)

    client = MagicMock()
    client.table.return_value = query
    return client, query


def test_registrations_table_name_matches_the_real_table():
    """Cả hai file cấu hình phải trỏ đúng bảng mà sinh viên ghi vào."""
    assert core_config.TABLE_REGISTRATIONS == "event_registrations"
    assert registration_service.TABLE == core_config.TABLE_REGISTRATIONS


@patch("app.services.event_service.get_supabase")
def test_registration_counts_query_the_event_registrations_table(
    mock_get_supabase,
):
    client, _query = _counts_client([])
    mock_get_supabase.return_value = client

    event_service._registration_counts([EVENT_ID])

    client.table.assert_called_once_with("event_registrations")


@patch("app.services.event_service.get_supabase")
def test_registration_counts_ignore_cancelled_and_waitlisted_registrations(mock_get_supabase):
    client, _query = _counts_client(
        [
            {"event_id": EVENT_ID, "registration_status": "REGISTERED"},
            {"event_id": EVENT_ID, "registration_status": "CHECKED_IN"},
            {"event_id": EVENT_ID, "registration_status": "CANCELLED"},
            {"event_id": EVENT_ID, "registration_status": "WAITLISTED"},
            {"event_id": EVENT_ID, "registration_status": None},
        ]
    )
    mock_get_supabase.return_value = client

    counts = event_service._registration_counts([EVENT_ID])

    # 2 đăng ký còn hiệu lực + 1 dòng thiếu trạng thái (dữ liệu cũ) = 3 (CANCELLED và WAITLISTED bị loại)
    assert counts == {EVENT_ID: 3}


@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service.get_supabase")
def test_organizer_event_shows_the_real_registered_count(
    mock_get_supabase,
    _mock_categories,
):
    client, _query = _counts_client([])
    mock_get_supabase.return_value = client

    event = event_service._to_organizer_event_out(
        {"event_id": EVENT_ID, "capacity": 300, "event_status": "PUBLISHED"},
        {},
        {EVENT_ID: 12},
    )

    assert event.registered_count == 12
    assert event.seats_left == 288
