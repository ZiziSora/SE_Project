"""Regression tests for the public event discovery and detail queries."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, call, patch

from app.core.app_time import now_naive_local

from app.services import event_service
from app.services.event_services import get_filtered_events_service


EVENT_ID = "11111111-1111-1111-1111-111111111111"
OTHER_EVENT_ID = "22222222-2222-2222-2222-222222222222"


def _query_client(rows):
    query = MagicMock()
    for method in ("select", "eq", "ilike", "in_", "limit", "gt", "gte", "lte", "order"):
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


@patch("app.services.event_services.supabase")
def test_explore_list_only_queries_events_starting_in_the_future(mock_supabase):
    """Trang Khám phá là nơi ĐĂNG KÝ, nên sự kiện đã bắt đầu / đã kết thúc
    không được hiện ra nữa."""
    _client, query = _query_client([])
    mock_supabase.table.return_value = query

    get_filtered_events_service()

    assert query.gt.call_count == 1
    column, threshold = query.gt.call_args.args
    assert column == "start_time"
    assert datetime.fromisoformat(threshold) <= now_naive_local()


@patch("app.services.event_services.supabase")
def test_explore_list_drops_events_past_their_registration_deadline(mock_supabase):
    """Hết hạn đăng ký = đóng đăng ký, dù sự kiện vẫn chưa diễn ra."""
    now = now_naive_local()
    open_event = {
        "event_id": EVENT_ID,
        "title": "Còn hạn đăng ký",
        "organizer_id": None,
        "category_id": None,
        "registration_deadline": (now + timedelta(days=3)).isoformat(),
    }
    closed_event = {
        "event_id": OTHER_EVENT_ID,
        "title": "Đã hết hạn đăng ký",
        "organizer_id": None,
        "category_id": None,
        "registration_deadline": (now - timedelta(days=1)).isoformat(),
    }
    _client, query = _query_client([open_event, closed_event])
    mock_supabase.table.return_value = query

    result = get_filtered_events_service()

    assert [e["event_id"] for e in result["events"]] == [EVENT_ID]
    assert result["total_items"] == 1


@patch("app.services.event_services.supabase")
def test_explore_list_sort_moi_nhat_orders_by_created_at_desc(mock_supabase):
    """Bộ lọc "Mới nhất" phải xếp sự kiện tạo gần đây nhất lên đầu, và sự kiện
    thiếu created_at xuống cuối (không phải giữ nguyên thứ tự DB trả về)."""
    now = now_naive_local()
    older = {
        "event_id": EVENT_ID,
        "title": "Tạo trước",
        "organizer_id": None,
        "category_id": None,
        "registration_deadline": None,
        "created_at": (now - timedelta(days=10)).isoformat(),
    }
    newer = {
        "event_id": OTHER_EVENT_ID,
        "title": "Tạo sau",
        "organizer_id": None,
        "category_id": None,
        "registration_deadline": None,
        "created_at": (now - timedelta(days=1)).isoformat(),
    }
    no_timestamp = {
        "event_id": "33333333-3333-3333-3333-333333333333",
        "title": "Thiếu created_at",
        "organizer_id": None,
        "category_id": None,
        "registration_deadline": None,
        "created_at": None,
    }
    # Truyền vào theo thứ tự lộn xộn để chắc chắn kết quả là do sort, không phải
    # do trùng thứ tự đầu vào.
    _client, query = _query_client([older, no_timestamp, newer])
    mock_supabase.table.return_value = query

    result = get_filtered_events_service(sort_by="Mới nhất")

    assert [e["event_id"] for e in result["events"]] == [
        OTHER_EVENT_ID,
        EVENT_ID,
        "33333333-3333-3333-3333-333333333333",
    ]


@patch("app.services.event_services.supabase")
def test_explore_list_keeps_events_without_a_registration_deadline(mock_supabase):
    """registration_deadline = NULL nghĩa là không đặt hạn, không phải hết hạn."""
    event = {
        "event_id": EVENT_ID,
        "title": "Không đặt hạn đăng ký",
        "organizer_id": None,
        "category_id": None,
        "registration_deadline": None,
    }
    _client, query = _query_client([event])
    mock_supabase.table.return_value = query

    result = get_filtered_events_service()

    assert [e["event_id"] for e in result["events"]] == [EVENT_ID]


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
        call("approval_status", "APPROVED"),
    ]
    # Sự kiện chưa duyệt (DRAFT / PENDING) vẫn không bao giờ lọt ra ngoài,
    # nhưng sự kiện ĐÃ TỪNG công khai thì mở được cả khi đã huỷ / đã đóng.
    assert query.in_.call_args == call(
        "event_status", ["PUBLISHED", "CANCELLED", "COMPLETED"]
    )


@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service.get_supabase")
def test_public_event_detail_still_returns_a_cancelled_event(
    mock_get_supabase,
    _mock_categories,
):
    """Thông báo huỷ gửi cho sinh viên có nút "Xem chi tiết sự kiện".

    Huỷ sự kiện KHÔNG xoá bản ghi, nên trang chi tiết phải mở được — nếu
    không thì nút đó luôn báo 404 "Không tìm thấy sự kiện".
    """
    client, _query = _query_client(
        [
            {
                "event_id": EVENT_ID,
                "title": "Đêm nhạc Sắc màu Sinh viên",
                "event_status": "CANCELLED",
                "approval_status": "APPROVED",
            }
        ]
    )
    mock_get_supabase.return_value = client

    result = event_service.get_event_by_id(EVENT_ID)

    assert result is not None
    assert result.event_status == "CANCELLED"


@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service.get_supabase")
def test_public_event_detail_includes_organizer_profile(
    mock_get_supabase,
    _mock_categories,
):
    organizer_id = "22222222-2222-2222-2222-222222222222"
    organization_type_id = "33333333-3333-3333-3333-333333333333"
    avatar_path = f"{organizer_id}/logo.png"
    avatar_public_url = (
        "https://example.supabase.co/storage/v1/object/public/avatars/logo.png"
    )
    event_query = _query_client(
        [
            {
                "event_id": EVENT_ID,
                "title": "Sự kiện công khai",
                "event_status": "PUBLISHED",
                "approval_status": "APPROVED",
                "organizer_id": organizer_id,
            }
        ]
    )[1]
    user_query = _query_client(
        [
            {
                "user_id": organizer_id,
                "full_name": "Câu lạc bộ Công nghệ",
                "avatar_url": avatar_path,
                "department_name": "Khoa Công nghệ thông tin",
                "organization_type_id": organization_type_id,
                "organization_description": "Kết nối sinh viên yêu công nghệ.",
                "contact_phone": "0901234567",
                "office_address": "Phòng A101",
            }
        ]
    )[1]
    organization_type_query = _query_client(
        [{"name": "Câu lạc bộ sinh viên"}]
    )[1]

    client = MagicMock()
    client.table.side_effect = [event_query, user_query, organization_type_query]
    client.storage.from_.return_value.get_public_url.return_value = (
        avatar_public_url
    )
    mock_get_supabase.return_value = client

    result = event_service.get_event_by_id(EVENT_ID)

    assert result is not None
    assert result.organizer is not None
    assert result.organizer.organizer_id == organizer_id
    assert result.organizer.name == "Câu lạc bộ Công nghệ"
    assert result.organizer.avatar_url == avatar_public_url
    assert result.organizer.organization_type == "Câu lạc bộ sinh viên"
    assert result.organizer.department_name == "Khoa Công nghệ thông tin"
    assert result.organizer.contact_phone == "0901234567"
    assert result.organizer.office_address == "Phòng A101"
