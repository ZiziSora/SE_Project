"""Trợ lý AI cho chatbox ở trang Khám phá.

Thiết kế theo 3 lớp để vừa "thông minh" vừa không bịa dữ liệu:

1. Truy xuất (RAG): lấy danh sách sự kiện đang mở từ database làm ngữ cảnh.
2. Sinh câu trả lời + kiểm soát phạm vi: gọi Gemini một lần, yêu cầu trả về
   JSON có cấu trúc gồm `in_scope`, `reply`, `relevant_event_ids`. Prompt bắt
   model chỉ dựa vào ngữ cảnh được cung cấp, không tự bịa sự kiện.
3. Chốt chặn ở backend: nếu `in_scope` = false, backend thay `reply` bằng đúng
   một câu từ chối cố định (bằng tiếng Việt) — nhờ vậy các test case về câu hỏi
   ngoài phạm vi luôn nhận được thông điệp giống nhau, không phụ thuộc model.

Nếu thiếu `GEMINI_API_KEY`, thư viện chưa cài, hoặc gọi API lỗi — service trả
về một câu trả lời dự phòng lịch sự, chatbox vẫn hoạt động (không văng lỗi 500).
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel

from app.core.supabase_client import get_supabase
from app.schemas.chatbot import ChatEventOut, ChatMessageIn, ChatMessageOut
from app.services import recommendation_service

logger = logging.getLogger(__name__)

# Dùng chung biến môi trường (GEMINI_API_KEY) với tính năng gợi ý sự kiện.
# Có thể ghi đè model qua biến môi trường GEMINI_CHAT_MODEL.
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
FALLBACK_GEMINI_MODEL = "gemini-flash-latest"

# Số sự kiện tối đa nhồi vào prompt làm ngữ cảnh — đủ để trả lời, không tốn token.
CONTEXT_EVENT_LIMIT = 25
# Số lượt hội thoại gần nhất được giữ lại để làm ngữ cảnh.
HISTORY_TURN_LIMIT = 10

# Câu từ chối cố định cho câu hỏi ngoài phạm vi (test case bám vào thông điệp này).
OUT_OF_SCOPE_REPLY = (
    "Xin lỗi, mình là trợ lý AI của UniEvent nên chỉ có thể hỗ trợ các câu hỏi "
    "liên quan đến sự kiện trong hệ thống. Bạn hãy thử hỏi về sự kiện sắp diễn ra, "
    "sự kiện đang mở đăng ký, hoặc nhờ mình gợi ý sự kiện theo chuyên ngành nhé!"
)

# Câu trả lời khi trợ lý AI tạm thời không dùng được (thiếu key / lỗi mạng).
FALLBACK_REPLY = (
    "Hiện mình chưa kết nối được với trợ lý AI. Bạn vui lòng thử lại sau ít phút, "
    "hoặc xem trực tiếp danh sách sự kiện ở trang Khám phá nhé."
)

SYSTEM_PROMPT = (
    "Bạn là trợ lý AI của UniEvent — hệ sinh thái sự kiện dành cho sinh viên đại học.\n"
    "Bạn CHỈ hỗ trợ các nội dung liên quan đến sự kiện trong hệ thống UniEvent:\n"
    "- Sự kiện sắp diễn ra, đang mở đăng ký, đã kết thúc.\n"
    "- Thông tin sự kiện: thời gian, địa điểm, hạn đăng ký, chủ đề, mô tả, ban tổ chức, "
    "số người đã đăng ký, số chỗ còn lại.\n"
    "- Gợi ý sự kiện theo khoa/chuyên ngành / sở thích của sinh viên.\n"
    "- Hoạt động của chính sinh viên: sự kiện họ đã đăng ký, đã điểm danh, đã lưu, đang chờ "
    "danh sách (dựa trên phần HỒ SƠ NGƯỜI DÙNG).\n"
    "- Cách sử dụng chức năng của UniEvent: đăng ký, huỷ đăng ký, điểm danh (check-in), lưu sự kiện.\n\n"
    "QUY TẮC BẮT BUỘC:\n"
    "1. Nếu câu hỏi KHÔNG thuộc các nội dung trên (ví dụ: sức khoẻ, y tế, kiến thức chung, "
    "lập trình, toán học, thời sự, tư vấn cá nhân, sản phẩm/website khác...), đặt "
    '"in_scope": false và KHÔNG cố trả lời câu hỏi đó.\n'
    '2. Nếu câu hỏi hợp lệ, đặt "in_scope": true và trả lời bằng tiếng Việt, ngắn gọn, thân thiện.\n'
    '3. Khi nói về sự kiện cụ thể, CHỈ dùng thông tin trong phần "DỮ LIỆU SỰ KIỆN" được cung cấp. '
    "Không bịa tên, thời gian, địa điểm. Nếu dữ liệu không có sự kiện phù hợp, nói rõ là hiện chưa có.\n"
    "4. Với câu hỏi về cách dùng UniEvent, được phép hướng dẫn theo hiểu biết chung về hệ thống.\n"
    '5. Khi người dùng nhờ gợi ý sự kiện "theo khoa của tôi" / "theo ngành của tôi" / '
    '"theo chuyên ngành" / "phù hợp với mình" mà phần "HỒ SƠ NGƯỜI DÙNG" đã có '
    "khoa/chuyên ngành, hãy DÙNG NGAY thông tin đó để chọn sự kiện phù hợp — TUYỆT ĐỐI "
    "KHÔNG hỏi lại người dùng học khoa/ngành gì. Chỉ hỏi lại khi hoàn toàn không có "
    "HỒ SƠ NGƯỜI DÙNG.\n"
    "6. Khi người dùng hỏi về hoạt động của họ (\"tôi đã đăng ký sự kiện nào\", \"tôi điểm danh "
    "chưa\", \"tôi đã lưu / đang chờ sự kiện nào\"), trả lời dựa trên phần HỒ SƠ NGƯỜI DÙNG; "
    "nếu phần đó không có mục tương ứng thì nói là hiện chưa có.\n"
    '7. "relevant_event_ids": liệt kê đúng event_id (lấy từ DỮ LIỆU SỰ KIỆN), TỐI ĐA 5, của '
    "những sự kiện bạn nhắc tới trong câu trả lời; để mảng rỗng nếu không nhắc tới sự kiện cụ thể.\n"
    "8. Câu trả lời không dài quá 120 từ.\n"
)


class _LlmChatResult(BaseModel):
    in_scope: bool
    reply: str
    relevant_event_ids: list[str] = []


# --------------------------------------------------------------------------- #
# Lớp 1 — Truy xuất dữ liệu sự kiện làm ngữ cảnh
# --------------------------------------------------------------------------- #
def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat()


def _category_map() -> dict[int, str]:
    res = (
        get_supabase()
        .table("event_categories")
        .select("category_id, name")
        .execute()
    )
    return {row["category_id"]: row["name"] for row in (res.data or [])}


def _fetch_context_events(limit: int = CONTEXT_EVENT_LIMIT) -> list[dict[str, Any]]:
    """Sự kiện đã duyệt, công khai, chưa kết thúc — sắp theo thời gian bắt đầu."""
    now = _now_iso()
    res = (
        get_supabase()
        .table("events")
        .select(
            "event_id, title, description, location, start_time, end_time, "
            "registration_deadline, capacity, category_id, organizer_id, "
            "event_status, approval_status"
        )
        .gte("end_time", now)
        .order("start_time", desc=False)
        .limit(limit * 3)
        .execute()
    )
    rows = [
        row
        for row in (res.data or [])
        if str(row.get("event_status", "")).upper() == "PUBLISHED"
        and str(row.get("approval_status", "")).upper() == "APPROVED"
    ]
    return rows[:limit]


def _fetch_organizers(organizer_ids: list[str]) -> dict[str, dict[str, Any]]:
    """users.user_id -> {full_name, department_name} cho các ban tổ chức của sự kiện.

    Dùng liên kết events.organizer_id -> users.user_id.
    """
    ids = [i for i in {*organizer_ids} if i]
    if not ids:
        return {}
    res = (
        get_supabase()
        .table("users")
        .select("user_id, full_name, department_name")
        .in_("user_id", ids)
        .execute()
    )
    return {row["user_id"]: row for row in (res.data or [])}


def _fetch_registration_counts(event_ids: list[str]) -> dict[str, int]:
    """events.event_id -> số lượt đăng ký còn hiệu lực (bỏ CANCELLED).

    Dùng liên kết event_registrations.event_id -> events.event_id.
    """
    ids = [i for i in {*event_ids} if i]
    if not ids:
        return {}
    res = (
        get_supabase()
        .table("event_registrations")
        .select("event_id, registration_status")
        .in_("event_id", ids)
        .execute()
    )
    counts: dict[str, int] = {}
    for row in res.data or []:
        if str(row.get("registration_status") or "").upper() == "CANCELLED":
            continue
        eid = str(row.get("event_id"))
        counts[eid] = counts.get(eid, 0) + 1
    return counts


def _fmt_dt(value: Optional[str]) -> str:
    if not value:
        return "chưa cập nhật"
    return str(value).replace("T", " ")[:16]


def _build_events_context(
    events: list[dict[str, Any]],
    categories: dict[int, str],
    reg_counts: Optional[dict[str, int]] = None,
    organizers: Optional[dict[str, dict[str, Any]]] = None,
) -> str:
    if not events:
        return "(Hiện chưa có sự kiện nào đang mở trong hệ thống.)"

    reg_counts = reg_counts or {}
    organizers = organizers or {}

    lines = []
    for ev in events:
        desc = (ev.get("description") or "").strip().replace("\n", " ")[:160]
        deadline = ev.get("registration_deadline")
        capacity = ev.get("capacity")
        registered = reg_counts.get(str(ev.get("event_id")), 0)

        seats = "không giới hạn"
        if capacity is not None:
            remaining = max(capacity - registered, 0)
            seats = f"{capacity} (còn {remaining})"

        org = organizers.get(ev.get("organizer_id")) or {}
        org_txt = org.get("full_name") or "chưa rõ"
        if org.get("department_name"):
            org_txt += f" — {org['department_name']}"

        lines.append(
            f'- event_id={ev.get("event_id")} | "{ev.get("title") or "Chưa có tiêu đề"}" '
            f'| chủ đề: {categories.get(ev.get("category_id"), "khác")} '
            f'| ban tổ chức: {org_txt} '
            f'| bắt đầu: {_fmt_dt(ev.get("start_time"))} '
            f'| kết thúc: {_fmt_dt(ev.get("end_time"))} '
            f'| hạn đăng ký: {_fmt_dt(deadline) if deadline else "không giới hạn"} '
            f'| địa điểm: {ev.get("location") or "chưa cập nhật"} '
            f'| sức chứa: {seats} '
            f'| đã đăng ký: {registered} người '
            f'| mô tả: {desc or "(không có)"}'
        )
    return "\n".join(lines)


def _fetch_user_activity(user_id: str) -> dict[str, list[str]]:
    """Hoạt động của sinh viên, khai thác các liên kết trong database:

    - event_registrations.user_id -> events         (đã đăng ký / đã điểm danh)
    - saved_events.student_id     -> events         (đã lưu)
    - waiting_list.student_id     -> events         (đang chờ danh sách)
    """
    sb = get_supabase()
    registered: list[str] = []
    checked_in: list[str] = []
    saved: list[str] = []
    waiting: list[str] = []

    reg = (
        sb.table("event_registrations")
        .select("registration_status, events(title)")
        .eq("user_id", user_id)
        .execute()
    )
    for row in reg.data or []:
        title = (row.get("events") or {}).get("title")
        if not title:
            continue
        status = str(row.get("registration_status") or "").upper()
        if "CANCEL" in status:
            continue
        if "CHECK" in status:
            checked_in.append(title)
        else:
            registered.append(title)

    saved_res = (
        sb.table("saved_events")
        .select("events(title)")
        .eq("student_id", user_id)
        .execute()
    )
    saved = [
        (row.get("events") or {}).get("title")
        for row in (saved_res.data or [])
        if (row.get("events") or {}).get("title")
    ]

    wait_res = (
        sb.table("waiting_list")
        .select("events(title)")
        .eq("student_id", user_id)
        .execute()
    )
    waiting = [
        (row.get("events") or {}).get("title")
        for row in (wait_res.data or [])
        if (row.get("events") or {}).get("title")
    ]

    return {
        "registered": registered,
        "checked_in": checked_in,
        "saved": saved,
        "waiting": waiting,
    }


def _build_user_profile_context(
    user_id: Optional[str], categories: dict[int, str]
) -> Optional[str]:
    """Hồ sơ sinh viên đã đăng nhập, tổng hợp tối đa từ các liên kết database:
    khoa/chuyên ngành, danh mục hay tham gia, sự kiện đã đăng ký / điểm danh /
    lưu / đang chờ.

    Nhờ đó trợ lý trả lời được "gợi ý theo khoa của tôi", "tôi đã đăng ký sự kiện
    nào", "tôi điểm danh chưa"... mà không hỏi lại. Lỗi truy vấn -> bỏ qua.
    """
    if not user_id:
        return None

    try:
        signals = recommendation_service._fetch_student_signals(user_id)
    except Exception:  # noqa: BLE001
        logger.exception("Không tải được tín hiệu hồ sơ người dùng cho chatbox.")
        signals = {}

    try:
        activity = _fetch_user_activity(user_id)
    except Exception:  # noqa: BLE001
        logger.exception("Không tải được hoạt động của người dùng cho chatbox.")
        activity = {"registered": [], "checked_in": [], "saved": [], "waiting": []}

    lines: list[str] = []
    department = (signals or {}).get("department_name")
    if department:
        lines.append(f"- Khoa/chuyên ngành: {department}")

    weights = (signals or {}).get("category_weight") or {}
    top = sorted(weights.items(), key=lambda kv: kv[1], reverse=True)[:3]
    top_names = [categories.get(cid) or str(cid) for cid, _ in top]
    if top_names:
        lines.append(
            "- Danh mục sự kiện sinh viên hay đăng ký/lưu: " + ", ".join(top_names)
        )

    def _join(titles: list[str]) -> str:
        titles = [t for t in titles if t][:8]
        return ", ".join(f'"{t}"' for t in titles)

    if activity["registered"]:
        lines.append("- Sự kiện đã đăng ký (chưa điểm danh): " + _join(activity["registered"]))
    if activity["checked_in"]:
        lines.append("- Sự kiện đã điểm danh: " + _join(activity["checked_in"]))
    if activity["saved"]:
        lines.append("- Sự kiện đã lưu: " + _join(activity["saved"]))
    if activity["waiting"]:
        lines.append("- Sự kiện đang chờ danh sách (waiting list): " + _join(activity["waiting"]))

    return "\n".join(lines) if lines else None


def _to_chat_event(ev: dict[str, Any], categories: dict[int, str]) -> ChatEventOut:
    return ChatEventOut(
        event_id=str(ev.get("event_id")),
        title=ev.get("title"),
        start_time=ev.get("start_time"),
        end_time=ev.get("end_time"),
        location=ev.get("location"),
        registration_deadline=ev.get("registration_deadline"),
        category_name=categories.get(ev.get("category_id")),
    )


# --------------------------------------------------------------------------- #
# Lớp 2 — Gọi Gemini để sinh câu trả lời có cấu trúc
# --------------------------------------------------------------------------- #
def _build_contents(
    payload: ChatMessageIn,
    events_context: str,
    user_profile_context: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Ghép lịch sử hội thoại + hồ sơ người dùng + ngữ cảnh dữ liệu cho Gemini."""
    contents: list[dict[str, Any]] = []
    for turn in payload.history[-HISTORY_TURN_LIMIT:]:
        contents.append(
            {
                "role": "user" if turn.role == "user" else "model",
                "parts": [{"text": turn.text}],
            }
        )

    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    profile_block = (
        f"HỒ SƠ NGƯỜI DÙNG (đã đăng nhập):\n{user_profile_context}\n\n"
        if user_profile_context
        else "HỒ SƠ NGƯỜI DÙNG: (chưa đăng nhập hoặc chưa có thông tin)\n\n"
    )
    final_user_text = (
        f"Hôm nay là {today}.\n\n"
        f"{profile_block}"
        f"DỮ LIỆU SỰ KIỆN (chỉ được dùng thông tin dưới đây khi nói về sự kiện cụ thể):\n"
        f"{events_context}\n\n"
        f"CÂU HỎI CỦA NGƯỜI DÙNG:\n{payload.message}"
    )
    contents.append({"role": "user", "parts": [{"text": final_user_text}]})
    return contents


def _call_gemini(contents: list[dict[str, Any]]) -> Optional[_LlmChatResult]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("Thiếu GEMINI_API_KEY — chatbox dùng câu trả lời dự phòng.")
        return None

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.warning("Thư viện google-genai chưa được cài — chatbox dùng dự phòng.")
        return None

    primary = (
        os.getenv("GEMINI_CHAT_MODEL")
        or os.getenv("GEMINI_MODEL")
        or DEFAULT_GEMINI_MODEL
    )
    # Model thứ 2 để thử lại khi model chính báo quá tải (503) hoặc 404.
    candidates = [primary] + [m for m in (FALLBACK_GEMINI_MODEL,) if m != primary]

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0,
        max_output_tokens=2048,
        response_mime_type="application/json",
        response_schema=_LlmChatResult,
    )

    client = genai.Client(api_key=api_key)
    for model in candidates:
        try:
            response = client.models.generate_content(
                model=model, contents=contents, config=config
            )
            return _LlmChatResult.model_validate_json(response.text)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Gọi Gemini (model=%s) cho chatbox thất bại.", model
            )
    return None


# --------------------------------------------------------------------------- #
# Lớp 3 — Điểm vào của router
# --------------------------------------------------------------------------- #
def answer_chat_message(
    payload: ChatMessageIn,
    user_id: Optional[str] = None,
) -> ChatMessageOut:
    try:
        categories = _category_map()
        events = _fetch_context_events()
    except Exception:  # noqa: BLE001
        logger.exception("Không tải được dữ liệu sự kiện cho chatbox.")
        categories, events = {}, []

    # Bổ sung dữ liệu qua các liên kết: ban tổ chức + số lượt đăng ký của từng sự kiện.
    event_ids = [str(e.get("event_id")) for e in events if e.get("event_id")]
    organizer_ids = [e.get("organizer_id") for e in events if e.get("organizer_id")]
    try:
        reg_counts = _fetch_registration_counts(event_ids)
    except Exception:  # noqa: BLE001
        logger.exception("Không đếm được lượt đăng ký cho chatbox.")
        reg_counts = {}
    try:
        organizers = _fetch_organizers(organizer_ids)
    except Exception:  # noqa: BLE001
        logger.exception("Không tải được ban tổ chức cho chatbox.")
        organizers = {}

    events_context = _build_events_context(events, categories, reg_counts, organizers)
    user_profile_context = _build_user_profile_context(user_id, categories)
    contents = _build_contents(payload, events_context, user_profile_context)

    result = _call_gemini(contents)
    if result is None:
        return ChatMessageOut(reply=FALLBACK_REPLY, in_scope=True, events=[])

    if not result.in_scope:
        return ChatMessageOut(reply=OUT_OF_SCOPE_REPLY, in_scope=False, events=[])

    events_by_id = {str(ev.get("event_id")): ev for ev in events}
    seen: set[str] = set()
    picked = []
    for eid in result.relevant_event_ids:
        if eid in events_by_id and eid not in seen:
            seen.add(eid)
            picked.append(_to_chat_event(events_by_id[eid], categories))
        if len(picked) >= 5:
            break
    reply = result.reply.strip() or FALLBACK_REPLY
    return ChatMessageOut(reply=reply, in_scope=True, events=picked)
