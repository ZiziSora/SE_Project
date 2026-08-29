"""Gợi ý sự kiện cá nhân hoá cho khối "Gợi ý cho bạn" ở trang Khám phá.

Tầng lõi (rule-based, luôn chạy được, không cần AI) chấm điểm sự kiện theo:
lịch sử đăng ký + sự kiện đã lưu của sinh viên (độ liên quan danh mục), khoa
của sinh viên so với đơn vị tổ chức, và độ phổ biến (số người đã đăng ký).

Nếu có `GEMINI_API_KEY` và sinh viên đã có tín hiệu hành vi (từng đăng ký
hoặc lưu ít nhất 1 sự kiện), một lớp LLM (Gemini API) xếp lại top ứng viên
rule-based và sinh lý do gợi ý ngắn gọn, cá nhân hoá. Nếu chưa có key, gọi
API lỗi, hoặc sinh viên chưa có lịch sử (cold start) — service tự rơi về kết
quả rule-based với lý do chung chung, tính năng vẫn hoạt động bình thường.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel

from app.core.supabase_client import get_supabase
from app.schemas.recommendation import RecommendedEventOut, RecommendationsOut

logger = logging.getLogger(__name__)

TABLE_EVENTS = "events"
TABLE_CATEGORIES = "event_categories"
TABLE_REGISTRATIONS = "event_registrations"
TABLE_SAVED_EVENTS = "saved_events"
TABLE_USERS = "users"

DB_PUBLISHED = "PUBLISHED"
DB_APPROVAL_APPROVED = "APPROVED"

# Số ứng viên rule-based đưa cho LLM xếp lại — đủ đa dạng nhưng không tốn prompt.
SHORTLIST_SIZE = 12
# gemini-2.5-flash-lite: model rẻ nhất hiện có ($0.10/$0.40 mỗi 1M token đầu
# vào/ra) — phù hợp cho tác vụ xếp hạng + sinh 1 câu lý do, gọi mỗi lần tải trang.
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat()


def _category_map() -> dict[int, str]:
    res = get_supabase().table(TABLE_CATEGORIES).select("category_id, name").execute()
    return {row["category_id"]: row["name"] for row in (res.data or [])}


def _fetch_candidate_events() -> list[dict[str, Any]]:
    """Sự kiện đã duyệt, công khai, chưa kết thúc — nguồn ứng viên để gợi ý."""
    now = _now_iso()
    res = (
        get_supabase()
        .table(TABLE_EVENTS)
        .select("*")
        .eq("event_status", DB_PUBLISHED)
        .eq("approval_status", DB_APPROVAL_APPROVED)
        .gte("end_time", now)
        .execute()
    )
    return res.data or []


def _fetch_registration_counts(event_ids: list[str]) -> dict[str, int]:
    if not event_ids:
        return {}
    res = (
        get_supabase()
        .table(TABLE_REGISTRATIONS)
        .select("event_id, registration_status")
        .in_("event_id", event_ids)
        .execute()
    )
    counts: dict[str, int] = {}
    for row in res.data or []:
        reg_status = (row.get("registration_status") or "").upper()
        if reg_status in ("CANCELLED", "WAITLISTED", "WAITLIST"):
            continue
        eid = row.get("event_id")
        if eid:
            counts[eid] = counts.get(eid, 0) + 1
    return counts


def _fetch_organizer_departments(organizer_ids: list[str]) -> dict[str, Optional[str]]:
    if not organizer_ids:
        return {}
    res = (
        get_supabase()
        .table(TABLE_USERS)
        .select("user_id, department_name")
        .in_("user_id", organizer_ids)
        .execute()
    )
    return {row["user_id"]: row.get("department_name") for row in (res.data or [])}


def _fetch_student_signals(student_id: str) -> dict[str, Any]:
    """Lịch sử đăng ký + sự kiện đã lưu của sinh viên, dùng để tính độ liên quan."""
    supabase = get_supabase()

    registrations_res = (
        supabase.table(TABLE_REGISTRATIONS)
        .select("event_id, registration_status, events(category_id)")
        .eq("user_id", student_id)
        .execute()
    )
    saved_res = (
        supabase.table(TABLE_SAVED_EVENTS)
        .select("event_id, events(category_id)")
        .eq("student_id", student_id)
        .execute()
    )
    user_res = (
        supabase.table(TABLE_USERS)
        .select("department_name")
        .eq("user_id", student_id)
        .maybe_single()
        .execute()
    )

    category_weight: dict[int, float] = {}
    engaged_event_ids: set[str] = set()

    for row in registrations_res.data or []:
        eid = row.get("event_id")
        if eid:
            engaged_event_ids.add(eid)
        if (row.get("registration_status") or "").upper() == "CANCELLED":
            continue
        cat_id = (row.get("events") or {}).get("category_id")
        if cat_id is not None:
            category_weight[cat_id] = category_weight.get(cat_id, 0) + 2

    for row in saved_res.data or []:
        eid = row.get("event_id")
        if eid:
            engaged_event_ids.add(eid)
        cat_id = (row.get("events") or {}).get("category_id")
        if cat_id is not None:
            category_weight[cat_id] = category_weight.get(cat_id, 0) + 1

    department_name = (user_res.data or {}).get("department_name") if user_res.data else None

    return {
        "category_weight": category_weight,
        "engaged_event_ids": engaged_event_ids,
        "department_name": department_name,
    }


def _score_events(
    events: list[dict[str, Any]],
    *,
    signals: Optional[dict[str, Any]],
    registered_counts: dict[str, int],
    organizer_departments: dict[str, Optional[str]],
) -> list[tuple[float, dict[str, Any]]]:
    max_registered = max(registered_counts.values(), default=0) or 1
    category_weight = (signals or {}).get("category_weight", {})
    department_name = (signals or {}).get("department_name")

    scored: list[tuple[float, dict[str, Any]]] = []
    for event in events:
        # Tín hiệu "đang hot" luôn có mặt — kể cả khi chưa có gì để cá nhân hoá.
        score = registered_counts.get(event.get("event_id"), 0) / max_registered

        cat_id = event.get("category_id")
        if cat_id is not None and cat_id in category_weight:
            score += category_weight[cat_id] * 3

        if department_name:
            organizer_dept = organizer_departments.get(event.get("organizer_id"))
            if organizer_dept and organizer_dept.strip().lower() == department_name.strip().lower():
                score += 2

        scored.append((score, event))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return scored


def _to_recommended_out(
    event: dict[str, Any],
    categories: dict[int, str],
    reason: str,
) -> RecommendedEventOut:
    data = dict(event)
    data["category_name"] = categories.get(event.get("category_id"))
    return RecommendedEventOut(reason=reason, **data)


class _LlmPick(BaseModel):
    event_id: str
    reason: str


class _LlmRecommendations(BaseModel):
    picks: list[_LlmPick]


def _build_llm_prompt(
    shortlist: list[dict[str, Any]],
    categories: dict[int, str],
    signals: dict[str, Any],
    limit: int,
) -> str:
    top_categories = sorted(
        signals.get("category_weight", {}).items(), key=lambda kv: kv[1], reverse=True
    )
    top_category_names = [categories.get(cat_id, str(cat_id)) for cat_id, _ in top_categories[:3]]

    profile_lines = [
        f"- Khoa/đơn vị: {signals.get('department_name') or 'không rõ'}",
        "- Danh mục sự kiện sinh viên quan tâm (dựa trên lịch sử đăng ký/lưu): "
        + (", ".join(top_category_names) if top_category_names else "chưa có dữ liệu"),
    ]

    event_lines = []
    for event in shortlist:
        start = event.get("start_time") or "chưa rõ thời gian"
        description = (event.get("description") or "").strip().replace("\n", " ")[:200]
        event_lines.append(
            f'- event_id={event["event_id"]} | title="{event.get("title")}" | '
            f'category={categories.get(event.get("category_id"), "khác")} | '
            f'start_time={start} | mô tả="{description}"'
        )

    return (
        "Hồ sơ sinh viên:\n"
        + "\n".join(profile_lines)
        + "\n\nDanh sách sự kiện ứng viên:\n"
        + "\n".join(event_lines)
        + f"\n\nHãy chọn tối đa {limit} sự kiện phù hợp nhất với sinh viên này, "
        "xếp theo mức độ liên quan giảm dần. Với mỗi sự kiện, viết 1 câu lý do "
        "ngắn gọn bằng tiếng Việt, cá nhân hoá theo hồ sơ và lịch sử ở trên "
        "(ví dụ nhắc tới danh mục hoặc khoa liên quan). Chỉ chọn event_id có "
        "trong danh sách ứng viên, không tự bịa thêm."
    )


def _rerank_with_llm(
    shortlist: list[dict[str, Any]],
    categories: dict[int, str],
    signals: dict[str, Any],
    limit: int,
) -> Optional[list[_LlmPick]]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        import importlib

        genai = importlib.import_module("google.genai")
    except Exception:
        logger.warning("Thư viện google-genai chưa được cài, bỏ qua bước gợi ý bằng AI.")
        return None

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    prompt = _build_llm_prompt(shortlist, categories, signals, limit)

    try:
        client = genai.Client(api_key=api_key)
        interaction = client.interactions.create(
            model=model,
            system_instruction=(
                "Bạn là trợ lý gợi ý sự kiện cho một hệ sinh thái sự kiện đại học. "
                "Trả lời ngắn gọn, chỉ dùng thông tin được cung cấp, không bịa thêm sự kiện."
            ),
            input=prompt,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": _LlmRecommendations.model_json_schema(),
            },
        )
        parsed = _LlmRecommendations.model_validate_json(interaction.output_text)
        return parsed.picks
    except Exception:  # noqa: BLE001
        logger.exception("Gọi Gemini API để gợi ý sự kiện thất bại, dùng kết quả rule-based.")
        return None


def get_recommendations_service(
    student_id: Optional[str],
    limit: int = 6,
) -> RecommendationsOut:
    events = _fetch_candidate_events()
    categories = _category_map()

    signals = _fetch_student_signals(student_id) if student_id else None
    engaged_ids = (signals or {}).get("engaged_event_ids", set())
    candidates = [e for e in events if e.get("event_id") not in engaged_ids]

    event_ids = [e["event_id"] for e in candidates if e.get("event_id")]
    organizer_ids = list({e.get("organizer_id") for e in candidates if e.get("organizer_id")})
    registered_counts = _fetch_registration_counts(event_ids)
    organizer_departments = _fetch_organizer_departments(organizer_ids)

    scored = _score_events(
        candidates,
        signals=signals,
        registered_counts=registered_counts,
        organizer_departments=organizer_departments,
    )

    has_personalization_signal = bool((signals or {}).get("category_weight"))
    shortlist = [event for _, event in scored[:SHORTLIST_SIZE]]

    llm_picks = (
        _rerank_with_llm(shortlist, categories, signals, limit)
        if signals and has_personalization_signal
        else None
    )

    if llm_picks:
        shortlist_by_id = {e["event_id"]: e for e in shortlist}
        recommendations = [
            _to_recommended_out(shortlist_by_id[pick.event_id], categories, pick.reason)
            for pick in llm_picks
            if pick.event_id in shortlist_by_id
        ][:limit]
        if recommendations:
            return RecommendationsOut(personalized=True, recommendations=recommendations)

    fallback_reason = (
        "Phù hợp với lịch sử tham gia của bạn"
        if has_personalization_signal
        else "Sự kiện đang được quan tâm nhiều"
    )
    recommendations = [
        _to_recommended_out(event, categories, fallback_reason) for _, event in scored[:limit]
    ]
    return RecommendationsOut(
        personalized=has_personalization_signal,
        recommendations=recommendations,
    )
