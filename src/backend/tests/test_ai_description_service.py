"""Unit tests cho app.services.ai_description_service.

Chỉ kiểm tra phần thuần logic (dựng prompt, định dạng thời gian, chặn khi thiếu
key). Không gọi Gemini thật — đường gọi API được test gián tiếp qua
test_organizer_event_router.py (mock ở tầng service).
"""
from datetime import datetime

import pytest

from app.services import ai_description_service as svc
from app.schemas.organizer_event import AIDescriptionIn


def _payload(**kw) -> AIDescriptionIn:
    base = {"title": "Workshop Jewels of Joy"}
    base.update(kw)
    return AIDescriptionIn(**base)


class TestFormatTimeRange:
    def test_same_day_start_and_end_collapse_to_one_date(self):
        out = svc._format_time_range(
            _payload(
                start_time=datetime(2026, 4, 11, 8, 30),
                end_time=datetime(2026, 4, 11, 16, 0),
            )
        )
        assert out == "08:30–16:00 ngày 11/04/2026"

    def test_multi_day_keeps_both_dates(self):
        out = svc._format_time_range(
            _payload(
                start_time=datetime(2026, 4, 11, 8, 30),
                end_time=datetime(2026, 4, 17, 16, 0),
            )
        )
        assert out == "08:30 ngày 11/04/2026 - 16:00 ngày 17/04/2026"

    def test_start_only(self):
        out = svc._format_time_range(_payload(start_time=datetime(2026, 4, 11, 8, 30)))
        assert out == "08:30 ngày 11/04/2026"

    def test_none_when_no_times(self):
        assert svc._format_time_range(_payload()) is None


class TestBuildPrompt:
    def test_generate_mode_has_layout_and_style_isolation(self):
        prompt = svc._build_prompt(
            _payload(
                location="Sảnh tòa I",
                start_time=datetime(2026, 4, 11, 8, 30),
                end_time=datetime(2026, 4, 11, 16, 0),
                capacity=60,
            )
        )
        assert "📌 Thông tin chi tiết:" in prompt
        assert "hoàn toàn mới" in prompt
        # Có mẫu văn phong nhưng kèm chỉ dẫn không được lấy lại chi tiết.
        assert "KHÔNG lấy lại" in prompt
        assert "08:30–16:00 ngày 11/04/2026" in prompt
        assert 'Đoạn mô tả / ý chính hiện tại' not in prompt

    def test_refine_mode_embeds_current_text_and_preserve_instruction(self):
        prompt = svc._build_prompt(
            _payload(current_description="lam vong tay tu charms, ung ho quy ABC")
        )
        assert "lam vong tay tu charms, ung ho quy ABC" in prompt
        assert "GIỮ NGUYÊN" in prompt

    def test_missing_location_and_time_are_omitted_from_context(self):
        prompt = svc._build_prompt(_payload())
        assert "- Địa điểm:" not in prompt
        assert "- Thời gian:" not in prompt


def test_raises_503_when_api_key_missing(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(svc.HTTPException) as exc_info:
        svc.generate_event_description(_payload())
    assert exc_info.value.status_code == 503
