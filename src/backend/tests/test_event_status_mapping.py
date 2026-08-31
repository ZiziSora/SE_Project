"""Test lớp ánh xạ trạng thái sự kiện giữa API (6 giá trị) và DB (2 cột enum).

Bối cảnh: Postgres chỉ có
    event_status    : DRAFT | PUBLISHED | CANCELLED | COMPLETED
    approval_status : PENDING | APPROVED | REJECTED (nullable)
còn API/UI dùng một trạng thái gộp: DRAFT | PENDING | PUBLISHED | ONGOING |
ENDED | CANCELLED. Ghi thẳng "PENDING" vào cột event_status sẽ làm Postgres báo
`invalid input value for enum event_status`.

Mock hoàn toàn Supabase — không đụng DB thật.
"""
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest

from app.schemas.organizer_event import EventCreate, EventStatus, EventUpdate
from app.services import event_service

ORGANIZER_ID = "22222222-2222-2222-2222-222222222222"
EVENT_ID = "11111111-1111-1111-1111-111111111111"

# Đúng những giá trị Postgres chấp nhận — nguồn sự thật của cả file test này
DB_EVENT_STATUS_VALUES = {"DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"}
DB_APPROVAL_STATUS_VALUES = {"PENDING", "APPROVED", "REJECTED", None}


def _now():
    return event_service._now_naive_local()


def _full_payload():
    now = _now()
    return {
        "title": "Hội thảo AI 2026",
        "category_id": 1,
        "location": "Hội trường I",
        "start_time": (now + timedelta(days=5)).isoformat(),
        "end_time": (now + timedelta(days=5, hours=3)).isoformat(),
        "registration_deadline": (now + timedelta(days=3)).isoformat(),
        "file_url": "https://storage.test/event_plan/ke-hoach.pdf",
    }


def _fake_supabase(returned_row):
    chain = MagicMock()
    for method in ("insert", "update", "eq", "select", "limit"):
        getattr(chain, method).return_value = chain
    chain.execute.return_value = MagicMock(data=[returned_row], count=1)
    client = MagicMock()
    client.table.return_value = chain
    return client, chain


# ─── Ghi: trạng thái API → cột DB ─────────────────────────────────────────────


@pytest.mark.parametrize("ui_status", [s.value for s in EventStatus])
def test_moi_trang_thai_api_deu_sinh_gia_tri_enum_hop_le(ui_status):
    """Chốt chặn chính: không trạng thái nào được sinh ra giá trị ngoài enum DB."""
    cols = event_service._ui_status_to_db(ui_status)

    assert cols["event_status"] in DB_EVENT_STATUS_VALUES
    if "approval_status" in cols:
        assert cols["approval_status"] in DB_APPROVAL_STATUS_VALUES


def test_pending_ghi_vao_approval_status_khong_ghi_vao_event_status():
    cols = event_service._ui_status_to_db(EventStatus.PENDING.value)

    assert cols["event_status"] == "DRAFT"
    assert cols["approval_status"] == "PENDING"


# ─── Đọc: cột DB → trạng thái API ─────────────────────────────────────────────


@pytest.mark.parametrize(
    "mo_ta, row, mong_doi",
    [
        ("nháp chưa gửi", {"event_status": "DRAFT", "approval_status": None}, "DRAFT"),
        (
            "nháp bị từ chối → cho sửa lại",
            {"event_status": "DRAFT", "approval_status": "REJECTED"},
            "DRAFT",
        ),
        (
            "đã gửi chờ duyệt",
            {"event_status": "DRAFT", "approval_status": "PENDING"},
            "PENDING",
        ),
        ("đã chốt", {"event_status": "COMPLETED", "approval_status": "APPROVED"}, "ENDED"),
        ("đã huỷ", {"event_status": "CANCELLED", "approval_status": "APPROVED"}, "CANCELLED"),
        ("hàng rỗng", {}, "DRAFT"),
    ],
)
def test_suy_trang_thai_hien_thi_tu_hai_cot(mo_ta, row, mong_doi):
    assert event_service._derive_ui_status(row) == mong_doi, mo_ta


def test_su_kien_da_duyet_phan_biet_theo_moc_thoi_gian():
    """PUBLISHED / ONGOING / ENDED không lưu trong DB mà suy từ start_time, end_time."""
    now = _now()
    base = {"event_status": "PUBLISHED", "approval_status": "APPROVED"}

    chua_toi_gio = {
        **base,
        "start_time": (now + timedelta(days=1)).isoformat(),
        "end_time": (now + timedelta(days=2)).isoformat(),
    }
    dang_dien_ra = {
        **base,
        "start_time": (now - timedelta(hours=1)).isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat(),
    }
    da_qua = {
        **base,
        "start_time": (now - timedelta(days=2)).isoformat(),
        "end_time": (now - timedelta(days=1)).isoformat(),
    }

    assert event_service._derive_ui_status(chua_toi_gio) == "PUBLISHED"
    assert event_service._derive_ui_status(dang_dien_ra) == "ONGOING"
    assert event_service._derive_ui_status(da_qua) == "ENDED"


@pytest.mark.parametrize("ui_status", ["DRAFT", "PENDING", "CANCELLED"])
def test_khu_hoi_ghi_xuong_roi_doc_len_khong_doi(ui_status):
    row = event_service._ui_status_to_db(ui_status)
    row.setdefault("approval_status", None)

    assert event_service._derive_ui_status(row) == ui_status


# ─── Luồng đầu-cuối ───────────────────────────────────────────────────────────


@patch("app.services.event_service._category_map", return_value={1: "Học thuật"})
@patch("app.services.event_service.notification_service.notify_admins_event_pending")
@patch("app.services.event_service.get_supabase")
def test_gui_duyet_ghi_dung_cot_va_tra_ve_pending(
    mock_get_supabase, mock_notify_admins, _cats
):
    """Chính là thao tác gây lỗi `invalid input value for enum event_status`."""
    payload = _full_payload()
    client, chain = _fake_supabase(
        {
            "event_id": EVENT_ID,
            "event_status": "DRAFT",
            "approval_status": "PENDING",
            **payload,
        }
    )
    mock_get_supabase.return_value = client

    result = event_service.create_event(
        EventCreate(event_status=EventStatus.PENDING, **payload),
        ORGANIZER_ID,
    )

    sent = chain.insert.call_args.args[0]
    assert sent["event_status"] == "DRAFT"       # KHÔNG được là "PENDING"
    assert sent["approval_status"] == "PENDING"
    assert result.event_status == "PENDING"      # hợp đồng API không đổi
    mock_notify_admins.assert_called_once_with(
        event_id=EVENT_ID,
        event_title=payload["title"],
    )


@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service.get_supabase")
def test_luu_ban_nhap_xoa_dau_vet_duyet_cu(mock_get_supabase, _cats):
    client, chain = _fake_supabase(
        {"event_id": EVENT_ID, "event_status": "DRAFT", "approval_status": None}
    )
    mock_get_supabase.return_value = client

    event_service.create_event(
        EventCreate(event_status=EventStatus.DRAFT, title="Bản nháp"),
        ORGANIZER_ID,
    )

    sent = chain.insert.call_args.args[0]
    assert sent["event_status"] == "DRAFT"
    assert sent["approval_status"] is None


@patch("app.services.event_revision_service.submit_revision")
@patch("app.services.event_service._validate_capacity_against_registrations")
@patch("app.services.event_service._registration_counts", return_value={})
@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service._get_raw")
@patch("app.services.event_service.get_supabase")
def test_sua_su_kien_cong_khai_thi_tao_ban_cho_duyet_khong_ghi_de(
    mock_get_supabase, mock_get_raw, _cats, _counts, _cap, mock_submit
):
    """Sự kiện ĐÃ DUYỆT: dữ liệu mới sang bảng `event_revisions`.

    Bảng `events` phải giữ nguyên bản đang công khai — nếu ghi đè thì Admin mất
    dữ liệu cũ để đối chiếu, còn sinh viên thì mất sự kiện trong lúc chờ duyệt.
    """
    payload = _full_payload()
    current = {
        "event_id": EVENT_ID,
        "event_status": "PUBLISHED",
        "approval_status": "APPROVED",
        **payload,
    }
    mock_get_raw.return_value = current
    client, chain = _fake_supabase(current)
    mock_get_supabase.return_value = client
    # Dòng `event_revisions` chỉ chứa nội dung MỚI; giá trị cũ để bảng `events`
    # giữ, backend tự đối chiếu khi dựng bảng so sánh.
    mock_submit.return_value = {
        "revision_id": "33333333-3333-3333-3333-333333333333",
        "event_id": EVENT_ID,
        "status": "PENDING",
        **payload,
        "title": "Tên mới",
    }

    result = event_service.update_event(
        EVENT_ID, EventUpdate(title="Tên mới"), ORGANIZER_ID
    )

    # 1. Không đụng vào bảng events
    chain.update.assert_not_called()
    # 2. Bản sửa nhận đúng dữ liệu mới + dòng hiện tại để chụp giá trị cũ
    assert mock_submit.call_args.kwargs["new_data"]["title"] == "Tên mới"
    assert mock_submit.call_args.kwargs["current"] is current
    # 3. Sự kiện vẫn công khai, kèm cờ và bảng so sánh cho giao diện
    assert result.event_status == "PUBLISHED"
    assert result.has_pending_revision is True
    change = result.pending_revision.changes[0]
    assert (change.label, change.old_text, change.new_text) == (
        "Tên sự kiện",
        payload["title"],
        "Tên mới",
    )


# Huỷ sự kiện công khai còn kéo theo thông báo cho sinh viên đã đăng ký — mock
# lại để test này chỉ nói về việc ghi thẳng xuống bảng `events`.
@patch("app.services.event_service.notification_service")
@patch("app.services.event_revision_service.submit_revision")
@patch("app.services.event_service._validate_capacity_against_registrations")
@patch("app.services.event_service._registration_counts", return_value={})
@patch("app.services.event_service._category_map", return_value={})
@patch("app.services.event_service._get_raw")
@patch("app.services.event_service.get_supabase")
def test_huy_su_kien_cong_khai_van_ghi_thang_khong_cho_duyet(
    mock_get_supabase, mock_get_raw, _cats, _counts, _cap, mock_submit, _notify
):
    """Huỷ sự kiện là quyết định của Ban tổ chức, không phải nội dung cần duyệt."""
    current = {
        "event_id": EVENT_ID,
        "event_status": "PUBLISHED",
        "approval_status": "APPROVED",
        **_full_payload(),
    }
    mock_get_raw.return_value = current
    client, chain = _fake_supabase({**current, "event_status": "CANCELLED"})
    mock_get_supabase.return_value = client

    event_service.update_event(
        EVENT_ID, EventUpdate(event_status=EventStatus.CANCELLED), ORGANIZER_ID
    )

    mock_submit.assert_not_called()
    assert chain.update.call_args.args[0]["event_status"] == "CANCELLED"


@patch("app.services.event_service._get_raw")
@patch("app.services.event_service.get_supabase")
def test_organizer_khong_the_tu_cong_khai_su_kien(mock_get_supabase, mock_get_raw):
    """Ghi PUBLISHED = tự duyệt sự kiện của chính mình → phải bị chặn."""
    from fastapi import HTTPException

    current = {
        "event_id": EVENT_ID,
        "event_status": "DRAFT",
        "approval_status": "PENDING",
        **_full_payload(),
    }
    mock_get_raw.return_value = current
    client, _chain = _fake_supabase(current)
    mock_get_supabase.return_value = client

    with pytest.raises(HTTPException) as exc:
        event_service.update_event(
            EVENT_ID,
            EventUpdate(event_status=EventStatus.PUBLISHED),
            ORGANIZER_ID,
        )

    assert exc.value.status_code == 403


# ─── Bộ lọc danh sách ─────────────────────────────────────────────────────────


class _FakeQuery:
    """Ghi lại các điều kiện mà `_apply_status_filter` gắn vào query."""

    def __init__(self):
        self.conditions: list[str] = []

    def eq(self, column, value):
        self.conditions.append(f"{column}={value}")
        return self

    def lte(self, column, value):
        self.conditions.append(f"{column}<={value}")
        return self

    def gte(self, column, value):
        self.conditions.append(f"{column}>={value}")
        return self

    def or_(self, expression):
        self.conditions.append(f"or({expression})")
        return self


@pytest.mark.parametrize("ui_status", [s.value for s in EventStatus])
def test_bo_loc_khong_truy_van_gia_tri_ngoai_enum(ui_status):
    """Lọc theo ONGOING/ENDED/PENDING cũng từng làm Postgres báo lỗi enum."""
    query = event_service._apply_status_filter(_FakeQuery(), ui_status)
    joined = " ".join(query.conditions)

    for gia_tri_ao in ("ONGOING", "ENDED"):
        assert gia_tri_ao not in joined
    # "PENDING" chỉ được phép xuất hiện kèm cột approval_status
    if "PENDING" in joined:
        assert "approval_status" in joined


def test_loc_cho_duyet_dung_ca_hai_cot():
    query = event_service._apply_status_filter(_FakeQuery(), "PENDING")

    assert "event_status=DRAFT" in query.conditions
    assert "approval_status=PENDING" in query.conditions
