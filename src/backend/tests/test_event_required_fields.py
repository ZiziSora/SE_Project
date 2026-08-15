"""Test ràng buộc 'không để trống trường bắt buộc' khi gửi sự kiện đi duyệt.

Mock hoàn toàn Supabase — không đụng DB thật.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.schemas.organizer_event import EventCreate, EventStatus
from app.services import event_service

ORGANIZER_ID = "22222222-2222-2222-2222-222222222222"
EVENT_ID = "11111111-1111-1111-1111-111111111111"

FULL_PAYLOAD = {
    "title": "Hội thảo AI 2026",
    "category_id": 1,
    "location": "Hội trường I",
    "start_time": "2026-12-01T09:00:00",
    "end_time": "2026-12-01T12:00:00",
    "registration_deadline": "2026-11-25T23:59:00",
    "file_url": "https://storage.test/event_plan/ke-hoach.pdf",
}


def _insert_returns(row):
    """Supabase client giả: `.table(...).insert(...)` trả về `row`."""
    chain = MagicMock()
    chain.insert.return_value = chain
    chain.execute.return_value = MagicMock(data=[row])
    client = MagicMock()
    client.table.return_value = chain
    return client, chain


@pytest.mark.parametrize(
    "missing_field, expected_label",
    [
        ("title", "Tên sự kiện"),
        ("category_id", "Lĩnh vực / Danh mục"),
        ("location", "Địa điểm"),
        ("start_time", "Ngày và giờ bắt đầu"),
        ("end_time", "Ngày và giờ kết thúc"),
        ("registration_deadline", "Hạn chót đăng ký"),
        ("file_url", "Tệp kế hoạch sự kiện"),
    ],
)
def test_gui_duyet_thieu_truong_bat_buoc_bi_tu_choi(missing_field, expected_label):
    """Pydantic chặn ngay từ vòng validate request."""
    data = {k: v for k, v in FULL_PAYLOAD.items() if k != missing_field}

    with pytest.raises(ValueError) as exc:
        EventCreate(event_status=EventStatus.PENDING, **data)

    assert expected_label in str(exc.value)


@patch("app.services.event_service.get_supabase")
def test_service_chan_gui_duyet_thieu_truong_truoc_khi_cham_db(mock_get_supabase):
    """Chốt chặn tầng service: payload lách qua Pydantic vẫn bị chặn."""
    client, chain = _insert_returns({})
    mock_get_supabase.return_value = client

    # model_copy KHÔNG chạy lại validator → mô phỏng payload lách qua Pydantic
    payload = EventCreate(event_status=EventStatus.DRAFT, title="Chỉ có tên").model_copy(
        update={"event_status": EventStatus.PENDING}
    )

    with pytest.raises(HTTPException) as exc:
        event_service.create_event(payload, ORGANIZER_ID)

    assert exc.value.status_code == 422
    assert "Thiếu thông tin bắt buộc" in exc.value.detail
    chain.insert.assert_not_called()


@patch("app.services.event_service._category_map", return_value={1: "Học thuật"})
@patch("app.services.event_service.get_supabase")
def test_du_truong_thi_tao_duoc_su_kien_pending(mock_get_supabase, _mock_categories):
    # Hàng Supabase trả về sau khi ghi: chờ duyệt = DRAFT + approval PENDING
    saved_row = {
        "event_id": EVENT_ID,
        "event_status": "DRAFT",
        "approval_status": "PENDING",
        **FULL_PAYLOAD,
    }
    client, chain = _insert_returns(saved_row)
    mock_get_supabase.return_value = client

    result = event_service.create_event(
        EventCreate(event_status=EventStatus.PENDING, **FULL_PAYLOAD),
        ORGANIZER_ID,
    )

    inserted = chain.insert.call_args.args[0]
    # DB không có giá trị enum "PENDING" cho event_status — trạng thái chờ duyệt
    # nằm ở cột approval_status. Chi tiết xem tests/test_event_status_mapping.py
    assert inserted["event_status"] == "DRAFT"
    assert inserted["approval_status"] == "PENDING"
    assert inserted["organizer_id"] == ORGANIZER_ID
    assert result.event_status == "PENDING"


@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service.get_supabase")
def test_ban_nhap_van_duoc_de_trong(mock_get_supabase, _mock_categories):
    """Lưu nháp không bị ràng buộc — kể cả khi chưa đặt tên."""
    client, chain = _insert_returns(
        {"event_id": EVENT_ID, "event_status": "DRAFT", "title": "Sự kiện chưa có tên"}
    )
    mock_get_supabase.return_value = client

    event_service.create_event(
        EventCreate(event_status=EventStatus.DRAFT),
        ORGANIZER_ID,
    )

    inserted = chain.insert.call_args.args[0]
    assert inserted["title"] == "Sự kiện chưa có tên"
    assert inserted["event_status"] == "DRAFT"
