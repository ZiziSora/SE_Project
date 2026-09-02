"""Sự kiện đã đầy + quá hạn huỷ đăng ký thì KHÔNG nhận danh sách chờ nữa.

Sinh viên chính thức chỉ huỷ được khi sự kiện còn cách ít nhất 5 ngày
(`history_services.cancel_registration_service`). Sau mốc đó không ai nhả chỗ,
nên người mới vào danh sách chờ chắc chắn không bao giờ được đôn lên — mời họ
xếp hàng là hứa suông.
"""
from datetime import timedelta

import pytest
from fastapi import HTTPException

from app.core.app_time import is_waitlist_open, now_naive_local
from app.routers import events as events_router
from app.schemas.event import EventOut


def _full_event(days_until_start: float) -> EventOut:
    start = now_naive_local() + timedelta(days=days_until_start)
    return EventOut(
        event_id="11111111-1111-1111-1111-111111111111",
        title="vấn đáp",
        start_time=start,
        end_time=start + timedelta(hours=2),
        capacity=30,
        event_status="PUBLISHED",
    )


class _FakeUser:
    id = "22222222-2222-2222-2222-222222222222"


@pytest.fixture
def patched_services(monkeypatch):
    """Sự kiện đã kín chỗ (30/30); người gọi chưa đăng ký, trừ khi test đổi lại."""
    state = {"event": None, "active_reg": None, "registered_calls": []}

    monkeypatch.setattr(
        events_router.event_service, "get_event_by_id", lambda _id: state["event"]
    )
    monkeypatch.setattr(
        events_router.registration_service, "get_registration_count", lambda _id: 30
    )
    monkeypatch.setattr(
        events_router.registration_service,
        "find_registration",
        lambda event_id, user_id, include_cancelled=True: state["active_reg"],
    )

    def _register_user(event_id, user_id, *args, **kwargs):
        state["registered_calls"].append(kwargs.get("registration_status"))
        return state["active_reg"] is not None

    monkeypatch.setattr(
        events_router.registration_service, "register_user", _register_user
    )
    return state


def test_helper_dong_danh_sach_cho_khi_qua_han_huy():
    now = now_naive_local()
    assert is_waitlist_open(now + timedelta(days=6)) is True
    assert is_waitlist_open(now + timedelta(days=4)) is False
    # Không có giờ bắt đầu thì không suy luận gì, cứ để mở.
    assert is_waitlist_open(None) is True


def test_da_day_va_qua_han_huy_thi_chan_409(patched_services):
    patched_services["event"] = _full_event(days_until_start=3)

    with pytest.raises(HTTPException) as excinfo:
        events_router.register_for_event(
            "11111111-1111-1111-1111-111111111111", _FakeUser()
        )

    assert excinfo.value.status_code == 409
    assert "danh sách chờ" in excinfo.value.detail
    assert patched_services["registered_calls"] == []


def test_da_day_nhung_con_han_huy_thi_van_vao_danh_sach_cho(patched_services):
    patched_services["event"] = _full_event(days_until_start=20)

    result = events_router.register_for_event(
        "11111111-1111-1111-1111-111111111111", _FakeUser()
    )

    assert result.is_waitlisted is True
    assert result.registration_status == "WAITLISTED"
    assert patched_services["registered_calls"] == ["WAITLISTED"]


def test_nguoi_da_dang_ky_khong_bi_chan(patched_services):
    """Chặn là để không nhận NGƯỜI MỚI; người đã có tên vẫn gọi lại được."""
    patched_services["event"] = _full_event(days_until_start=3)
    patched_services["active_reg"] = {
        "registration_id": "33333333-3333-3333-3333-333333333333",
        "registration_status": "REGISTERED",
    }

    result = events_router.register_for_event(
        "11111111-1111-1111-1111-111111111111", _FakeUser()
    )

    assert result.already_registered is True
