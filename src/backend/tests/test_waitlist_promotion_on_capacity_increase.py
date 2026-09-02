"""Tăng sức chứa thì phải đôn người trong danh sách chờ lên chính thức.

Trước đây `promote_next_waitlisted_participant` chỉ chạy khi có người HUỶ đăng
ký, nên Ban tổ chức nới sức chứa từ 3 lên 5 vẫn để hai ghế trống trong khi danh
sách chờ còn người đứng xếp hàng.
"""

from unittest.mock import MagicMock, patch

from app.models.enum import NotificationType
from app.services import event_revision_service, event_service, registration_service


EVENT_ID = "11111111-1111-1111-1111-111111111111"


def _client(registered_count, waiting):
    """Supabase giả: đếm đăng ký → đọc danh sách chờ → cập nhật từng người."""
    query = MagicMock()
    for method in ("select", "eq", "neq", "in_", "order", "limit", "update"):
        getattr(query, method).return_value = query
    query.execute.side_effect = [
        MagicMock(count=registered_count),
        MagicMock(data=waiting),
    ] + [MagicMock(data=[]) for _ in waiting]

    client = MagicMock()
    client.table.return_value = query
    return client, query


@patch("app.services.registration_service.notification_service.create_notification")
@patch("app.services.registration_service.get_supabase")
def test_promote_fills_only_the_new_seats(mock_get_supabase, mock_notify):
    """Sức chứa 3 → 5 với 3 người chính thức: chỉ 2 người đầu hàng được đôn."""
    waiting = [
        {"registration_id": "reg-1", "user_id": "user-1"},
        {"registration_id": "reg-2", "user_id": "user-2"},
        {"registration_id": "reg-3", "user_id": "user-3"},
    ]
    client, query = _client(3, waiting)
    mock_get_supabase.return_value = client

    promoted = registration_service.promote_waitlisted(EVENT_ID, 5, "Ngày hội CLB")

    assert promoted == ["reg-1", "reg-2"]
    query.update.assert_called_with({"registration_status": "REGISTERED"})
    assert query.update.call_count == 2
    assert mock_notify.call_count == 2
    assert (
        mock_notify.call_args_list[0].kwargs["notification_type"]
        == NotificationType.WAITLIST_PROMOTED
    )


@patch("app.services.registration_service.notification_service.create_notification")
@patch("app.services.registration_service.get_supabase")
def test_promote_does_nothing_when_still_full(mock_get_supabase, mock_notify):
    """Sức chứa mới vẫn bằng số người đã đăng ký thì không ai được đôn."""
    client, query = _client(5, [])
    mock_get_supabase.return_value = client

    assert registration_service.promote_waitlisted(EVENT_ID, 5) == []
    query.update.assert_not_called()
    mock_notify.assert_not_called()


@patch("app.services.registration_service.get_supabase")
def test_promote_everyone_when_capacity_becomes_unlimited(mock_get_supabase):
    """Bỏ giới hạn sức chứa (None) thì đôn hết danh sách chờ."""
    waiting = [
        {"registration_id": "reg-1", "user_id": "user-1"},
        {"registration_id": "reg-2", "user_id": "user-2"},
    ]
    client, _query = _client(9, waiting)
    # Không giới hạn thì bỏ qua bước đếm, execute đầu tiên là đọc danh sách chờ.
    _query.execute.side_effect = [MagicMock(data=waiting)] + [
        MagicMock(data=[]) for _ in waiting
    ]
    mock_get_supabase.return_value = client

    with patch(
        "app.services.registration_service.notification_service.create_notification"
    ):
        assert registration_service.promote_waitlisted(EVENT_ID, None) == [
            "reg-1",
            "reg-2",
        ]


# ── Cổng "chỉ khi TĂNG mới đôn" ──────────────────────────────────────────────


@patch("app.services.event_service.registration_service.promote_waitlisted")
def test_event_service_promotes_only_when_capacity_grows(mock_promote):
    before = {"capacity": 3, "title": "Ngày hội CLB"}

    event_service._promote_waitlist_if_capacity_raised(
        EVENT_ID, before, {"capacity": 5, "title": "Ngày hội CLB"}, {}
    )
    mock_promote.assert_called_once_with(EVENT_ID, 5, event_title="Ngày hội CLB")

    mock_promote.reset_mock()
    event_service._promote_waitlist_if_capacity_raised(
        EVENT_ID, before, {"capacity": 3}, {}
    )
    event_service._promote_waitlist_if_capacity_raised(
        EVENT_ID, before, {"capacity": 2}, {}
    )
    event_service._promote_waitlist_if_capacity_raised(
        EVENT_ID, {"capacity": None}, {"capacity": 10}, {}
    )
    mock_promote.assert_not_called()


@patch("app.services.event_revision_service.registration_service.promote_waitlisted")
def test_approved_revision_promotes_when_capacity_grows(mock_promote):
    before = {"capacity": 3, "title": "Ngày hội CLB"}

    event_revision_service._promote_waitlist_if_capacity_raised(
        {"event_id": EVENT_ID, "capacity": 8, "title": "Ngày hội CLB"}, before
    )
    mock_promote.assert_called_once_with(
        EVENT_ID, 8, event_title="Ngày hội CLB"
    )

    mock_promote.reset_mock()
    event_revision_service._promote_waitlist_if_capacity_raised(
        {"event_id": EVENT_ID, "capacity": 3}, before
    )
    mock_promote.assert_not_called()
