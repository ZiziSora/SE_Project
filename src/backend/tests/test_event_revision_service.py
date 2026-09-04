"""Test phần logic thuần của bảng `event_revisions` — không đụng Supabase.

Trọng tâm là hai thứ dễ sai nhất:
    1. So sánh cũ / mới: chuỗi ngày giờ cùng một mốc nhưng khác định dạng, hoặc
       sức chứa "200" và 200, KHÔNG được tính là thay đổi — nếu không mỗi lần
       bấm Lưu đều sinh ra một yêu cầu chỉnh sửa "ma" gửi cho Admin.
    2. Chuỗi hiển thị trong bảng gạch bỏ "cũ → mới".
"""
import pytest

from app.services import event_revision_service as revision_service

CATEGORIES = {1: "Học thuật", 2: "Tình nguyện"}

CURRENT = {
    "title": "Hội thảo AI",
    "category_id": 1,
    "location": "Hội trường A",
    "start_time": "2026-09-01T08:00:00",
    "end_time": "2026-09-01T11:00:00",
    "registration_deadline": "2026-08-30T23:59:00",
    "capacity": 200,
    "description": "Mô tả cũ",
    "banner_url": "https://storage.test/banner/old.png",
    "file_url": None,
}


@pytest.mark.parametrize(
    "mo_ta, new_data",
    [
        ("cùng mốc thời gian, khác định dạng chuỗi",
         {"start_time": "2026-09-01T08:00:00+00:00"}),
        ("cùng số, khác kiểu dữ liệu", {"capacity": "200"}),
        ("giá trị y hệt", {"title": "Hội thảo AI", "description": "Mô tả cũ"}),
        ("null và chuỗi rỗng là như nhau", {"file_url": ""}),
    ],
)
def test_khong_coi_la_thay_doi(mo_ta, new_data):
    assert revision_service.changed_fields(new_data, CURRENT) == [], mo_ta


def test_liet_ke_dung_truong_doi_theo_thu_tu_hien_thi():
    new_data = {
        "capacity": 150,
        "location": "Nhà văn hoá",
        "start_time": "2026-09-02T08:00:00",
        "title": "Hội thảo AI 2026",
        "description": "Mô tả cũ",  # không đổi → không được lọt vào
    }

    assert revision_service.changed_fields(new_data, CURRENT) == [
        "title",
        "location",
        "start_time",
        "capacity",
    ]


@pytest.mark.parametrize(
    "field, value, mong_doi",
    [
        ("start_time", "2026-09-01T08:00:00", "01/09/2026 08:00"),
        ("category_id", 2, "Tình nguyện"),
        ("capacity", 1500, "1.500 người"),
        ("capacity", None, "Không giới hạn"),
        ("location", None, "(để trống)"),
        (
            "file_url",
            "https://storage.test/event_plan/K%E1%BA%BF%20ho%E1%BA%A1ch.pdf",
            "Kế hoạch.pdf",
        ),
    ],
)
def test_dinh_dang_gia_tri_hien_thi(field, value, mong_doi):
    assert revision_service.format_value(field, value, CATEGORIES) == mong_doi


def _revision_row(**thay_doi):
    """Một dòng `event_revisions`: toàn bộ nội dung MỚI, không có giá trị cũ."""
    return {
        "revision_id": "33333333-3333-3333-3333-333333333333",
        "event_id": "11111111-1111-1111-1111-111111111111",
        "status": "PENDING",
        "submitted_at": "2026-08-19T03:00:00+00:00",
        **{field: CURRENT.get(field) for field in revision_service.REVISION_FIELDS},
        **thay_doi,
    }


def test_to_out_dung_bang_so_sanh_tu_dong_events():
    """Giá trị cũ lấy từ dòng `events`, bảng không lưu ảnh chụp nào."""
    row = _revision_row(location="Nhà văn hoá", capacity=150)

    out = revision_service.to_out(row, CATEGORIES, current_event=CURRENT)

    assert [(c.label, c.old_text, c.new_text) for c in out.changes] == [
        ("Địa điểm", "Hội trường A", "Nhà văn hoá"),
        ("Sức chứa", "200 người", "150 người"),
    ]
    # `values` là toàn bộ nội dung mới, dùng để nạp lại form chỉnh sửa
    assert out.values["title"] == "Hội thảo AI"
    assert out.values["location"] == "Nhà văn hoá"


def test_to_out_khong_co_dong_events_thi_khong_co_bang_so_sanh():
    out = revision_service.to_out(_revision_row(location="Nhà văn hoá"), CATEGORIES)

    assert out.changes == []
    assert out.values["location"] == "Nhà văn hoá"
