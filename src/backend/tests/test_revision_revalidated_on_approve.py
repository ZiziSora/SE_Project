"""Bản sửa phải được kiểm tra LẠI ở thời điểm Admin duyệt, không chỉ lúc gửi.

Lỗi gốc (TOCTOU — Time-Of-Check to Time-Of-Use): ràng buộc được kiểm tra khi Ban
tổ chức GỬI bản sửa, nhưng dữ liệu chỉ thực sự được ghi vào bảng `events` khi
Admin DUYỆT. Giữa hai mốc đó sinh viên vẫn đăng ký được (bảng `events` còn giữ
sức chứa CŨ nên không có gì chặn) và thời gian vẫn trôi.

Kịch bản tái hiện: sức chứa 5, đã có 1 người đăng ký. Ban tổ chức hạ xuống 1 →
hợp lệ tại thời điểm gửi. Trong lúc chờ duyệt có người thứ hai đăng ký. Admin
bấm duyệt → sự kiện có sức chứa 1 nhưng 2 người đã đăng ký.
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.services import event_revision_service as revision_service

EVENT_ID = "11111111-1111-1111-1111-111111111111"
REVISION_ID = "22222222-2222-2222-2222-222222222222"


def _dt(days):
    return (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")


def _published_event(**thay_doi):
    """Dòng `events` của một sự kiện ĐÃ CÔNG KHAI và CHƯA bắt đầu."""
    row = {
        "event_id": EVENT_ID,
        "title": "Ngày hội CLB",
        "category_id": 1,
        "location": "Hội trường A",
        "start_time": _dt(10),
        "end_time": _dt(11),
        "registration_deadline": _dt(5),
        "capacity": 5,
        "description": "Mô tả",
        "banner_url": None,
        "file_url": "https://storage.test/plan.pdf",
        "event_status": "PUBLISHED",
        "approval_status": "APPROVED",
    }
    row.update(thay_doi)
    return row


def _revision(**thay_doi):
    """Dòng `event_revisions`: ảnh chụp TOÀN BỘ nội dung mới."""
    row = {k: v for k, v in _published_event().items() if k in revision_service.REVISION_FIELDS}
    row.update({"revision_id": REVISION_ID, "event_id": EVENT_ID, "status": "PENDING"})
    row.update(thay_doi)
    return row


# ── Chính lỗi được báo: sức chứa mới < số người đã đăng ký ───────────────────


@patch("app.services.event_service._registration_counts")
def test_chan_duyet_khi_co_nguoi_dang_ky_them_luc_cho_duyet(mock_counts):
    """Gửi lúc 1 người đăng ký (hợp lệ) → duyệt lúc đã 2 người → phải chặn."""
    mock_counts.return_value = {EVENT_ID: 2}

    with pytest.raises(HTTPException) as loi:
        revision_service._revalidate_before_apply(
            _revision(capacity=1), _published_event(capacity=5)
        )

    assert loi.value.status_code == 409
    assert "đã thay đổi kể từ lúc Ban tổ chức gửi" in loi.value.detail
    assert "2" in loi.value.detail  # số người đang đăng ký thật


@patch("app.services.event_service._registration_counts")
def test_cho_duyet_khi_suc_chua_van_du_cho(mock_counts):
    """Sức chứa mới vừa đủ số người đã đăng ký thì vẫn duyệt bình thường."""
    mock_counts.return_value = {EVENT_ID: 2}

    revision_service._revalidate_before_apply(
        _revision(capacity=2), _published_event(capacity=5)
    )


@patch("app.services.event_service._registration_counts")
def test_bo_qua_kiem_tra_suc_chua_khi_ban_sua_khong_dong_toi_suc_chua(mock_counts):
    """Sửa mô tả thôi thì không đụng tới sức chứa, dù đang quá tải sẵn."""
    mock_counts.return_value = {EVENT_ID: 99}

    revision_service._revalidate_before_apply(
        _revision(description="Mô tả mới"), _published_event(capacity=5)
    )


# ── Cùng lớp lỗi: thời gian và trạng thái cũng phải kiểm tra lại ─────────────


@patch("app.services.event_service._registration_counts")
def test_chan_duyet_khi_moc_bat_dau_moi_da_troi_qua(mock_counts):
    """Bản sửa dời lịch sang mốc nay đã thành quá khứ → không áp dụng được."""
    mock_counts.return_value = {EVENT_ID: 0}

    with pytest.raises(HTTPException) as loi:
        revision_service._revalidate_before_apply(
            _revision(
                start_time=_dt(-2), end_time=_dt(-1), registration_deadline=_dt(-3)
            ),
            _published_event(),
        )

    assert loi.value.status_code == 409
    assert "quá khứ" in loi.value.detail


@pytest.mark.parametrize(
    "mo_ta, su_kien, nhan",
    [
        ("sự kiện đã bắt đầu", {"start_time": _dt(-1), "end_time": _dt(1)}, "Đang diễn ra"),
        ("sự kiện đã bị huỷ", {"event_status": "CANCELLED"}, "Đã huỷ"),
        ("sự kiện đã kết thúc", {"event_status": "COMPLETED"}, "Đã kết thúc"),
    ],
)
def test_chan_duyet_khi_su_kien_khong_con_o_trang_thai_cho_ap_dung(mo_ta, su_kien, nhan):
    with pytest.raises(HTTPException) as loi:
        revision_service._revalidate_before_apply(_revision(), _published_event(**su_kien))

    assert loi.value.status_code == 409, mo_ta
    assert nhan in loi.value.detail


def test_chan_duyet_khi_su_kien_da_bi_xoa():
    with pytest.raises(HTTPException) as loi:
        revision_service._revalidate_before_apply(_revision(), None)

    assert loi.value.status_code == 404


# ── approve_revision phải DỪNG hẳn, không ghi gì vào bảng `events` ───────────


@patch("app.services.event_service._registration_counts")
@patch("app.services.event_revision_service.get_supabase")
@patch("app.services.event_revision_service._event_row")
@patch("app.services.event_revision_service._get_pending_by_id")
def test_approve_revision_khong_ghi_de_khi_kiem_tra_that_bai(
    mock_pending, mock_event_row, mock_supabase, mock_counts
):
    mock_pending.return_value = _revision(capacity=1)
    mock_event_row.return_value = _published_event(capacity=5)
    mock_counts.return_value = {EVENT_ID: 2}
    client = MagicMock()
    mock_supabase.return_value = client

    with pytest.raises(HTTPException) as loi:
        revision_service.approve_revision(REVISION_ID)

    assert loi.value.status_code == 409
    # Không một lệnh ghi nào được phát ra: sự kiện giữ nguyên, bản sửa vẫn PENDING
    client.table.assert_not_called()
