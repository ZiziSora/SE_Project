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

import io
import ipaddress
import logging
import os
import re
import xml.etree.ElementTree as ET
import zipfile
from collections import OrderedDict
from typing import Any, Optional
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel

from app.core.app_time import now_naive_local
from app.core.supabase_client import get_supabase
from app.schemas.chatbot import ChatEventOut, ChatMessageIn, ChatMessageOut, ChatTurn
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

# Trạng thái đăng ký KHÔNG chiếm chỗ chính thức — phải khớp với
# registration_service và event_services.get_filtered_events_service, nếu không thì
# cùng một sự kiện hiện hai con số "đã đăng ký" khác nhau (từng gây cảnh "4/3").
_INACTIVE_REG_STATUSES = {"CANCELLED", "WAITLISTED", "WAITLIST"}

# --- Nạp nội dung TỆP KẾ HOẠCH (events.file_url) khi câu hỏi nói về 1 sự kiện cụ thể ---
# Ban tổ chức bắt buộc đính kèm 1 tệp kế hoạch (.pdf / .docx) cho mỗi sự kiện.
# Khi người dùng hỏi sâu về một sự kiện, ta tải tệp đó và đưa vào ngữ cảnh để trả lời
# chi tiết (lịch trình, thể lệ, giải thưởng, yêu cầu chuẩn bị, đơn vị phối hợp...).
PLAN_CONTEXT_MAX_CHARS = int(os.getenv("CHAT_PLAN_MAX_CHARS", "6000"))
PLAN_MAX_EVENTS = int(os.getenv("CHAT_PLAN_MAX_EVENTS", "2"))
PLAN_DOWNLOAD_TIMEOUT = 12
PLAN_MAX_BYTES = 12 * 1024 * 1024
# Tổng dung lượng PDF đính kèm 1 request (giới hạn inline-data của Gemini ~20MB).
PLAN_PDF_TOTAL_BYTES = 14 * 1024 * 1024
_PDF_MIME = "application/pdf"
# Cache LRU theo tiến trình để không tải lại tệp ở mỗi tin nhắn. Giữ ít mục vì mỗi
# mục PDF có thể tới PLAN_MAX_BYTES; evict mục cũ nhất thay vì xoá sạch cả cache.
_PLAN_CACHE: "OrderedDict[str, Optional[dict[str, Any]]]" = OrderedDict()
_PLAN_CACHE_MAX = 8
_WORD_RE = re.compile(r"\w+", re.UNICODE)
# Hư từ tiếng Việt hay xuất hiện trong tiêu đề, không mang tính định danh sự kiện.
_TITLE_STOPWORDS = {
    "su", "kien", "chuong", "trinh", "ngay", "hoi", "buoi", "cuoc", "thi",
    "va", "cac", "cho", "cua", "ve", "the", "nam", "lan", "thu",
}

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
    "- Chi tiết trong TỆP KẾ HOẠCH sự kiện do ban tổ chức tải lên (khi được cung cấp ở phần "
    '"KẾ HOẠCH CHI TIẾT SỰ KIỆN" hoặc tệp PDF đính kèm): nội dung chương trình, lịch trình, '
    "thể lệ, giải thưởng, yêu cầu chuẩn bị, đối tượng tham gia, đơn vị phối hợp...\n"
    "- Gợi ý sự kiện theo khoa/chuyên ngành / sở thích của sinh viên.\n"
    "- Hoạt động của chính sinh viên: sự kiện họ đã đăng ký, đã điểm danh, đã lưu, đang chờ "
    "danh sách (dựa trên phần HỒ SƠ NGƯỜI DÙNG).\n"
    "- Cách sử dụng chức năng của UniEvent: đăng ký, huỷ đăng ký, điểm danh (check-in), lưu sự kiện.\n\n"
    "QUY TẮC BẮT BUỘC:\n"
    "1. Nếu câu hỏi KHÔNG thuộc các nội dung trên (ví dụ: sức khoẻ, y tế, kiến thức chung, "
    "lập trình, toán học, thời sự, tư vấn cá nhân, sản phẩm/website khác...), đặt "
    '"in_scope": false và KHÔNG cố trả lời câu hỏi đó.\n'
    "   LƯU Ý: câu hỏi chỉ NHẮC TÊN một khoa / ngành / lĩnh vực học thuật (ví dụ "
    '"khoa Sinh", "khoa Công nghệ thông tin", "sinh viên ngành Luật", "ngành Kinh tế") '
    "để nhờ gợi ý hoặc tìm sự kiện thì VẪN thuộc phạm vi — đó KHÔNG phải là hỏi kiến "
    'thức của lĩnh vực đó. Những câu như vậy luôn đặt "in_scope": true.\n'
    '2. Nếu câu hỏi hợp lệ, đặt "in_scope": true và trả lời bằng tiếng Việt, ngắn gọn, thân thiện.\n'
    '3. Khi nói về sự kiện cụ thể, CHỈ dùng thông tin trong phần "DỮ LIỆU SỰ KIỆN", phần '
    '"KẾ HOẠCH CHI TIẾT SỰ KIỆN" và tệp PDF đính kèm (nếu có). Không bịa tên, thời gian, địa điểm, '
    "thể lệ, giải thưởng. Nếu người dùng hỏi chi tiết mà không có kế hoạch của đúng sự kiện đó "
    "trong ngữ cảnh, nói rõ là hiện chưa có thông tin, đừng đoán.\n"
    "4. Với câu hỏi về cách dùng UniEvent, được phép hướng dẫn theo hiểu biết chung về hệ thống.\n"
    '5. Khi người dùng nhờ gợi ý sự kiện "theo khoa của tôi" / "theo ngành của tôi" / '
    '"theo chuyên ngành" / "phù hợp với mình" mà phần "HỒ SƠ NGƯỜI DÙNG" đã có '
    "khoa/chuyên ngành, hãy DÙNG NGAY thông tin đó để chọn sự kiện phù hợp — TUYỆT ĐỐI "
    "KHÔNG hỏi lại người dùng học khoa/ngành gì. Chỉ hỏi lại khi hoàn toàn không có "
    "HỒ SƠ NGƯỜI DÙNG.\n"
    "   Khi người dùng nêu RÕ tên khoa/ngành ngay trong câu hỏi (ví dụ \"gợi ý sự "
    "kiện cho sinh viên khoa Sinh\"), hãy dùng luôn tên khoa/ngành đó để chọn sự kiện "
    "phù hợp theo chủ đề trong DỮ LIỆU SỰ KIỆN. Nếu không có sự kiện nào phù hợp, vẫn "
    'đặt "in_scope": true và nói ngắn gọn rằng hiện chưa có sự kiện phù hợp cho '
    "khoa/ngành đó — TUYỆT ĐỐI không trả lời bằng lý do ngoài phạm vi.\n"
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
    # Mốc so sánh phải là giờ VN — cột thời gian trong DB lưu giờ VN naive
    return now_naive_local().isoformat()


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
    # Lọc trạng thái ngay trong truy vấn (DB lưu enum CHỮ HOA — xem
    # event_services.get_filtered_events_service) để không bị rớt sự kiện hợp lệ
    # khi các sự kiện sớm nhất có nhiều bản chưa duyệt.
    res = (
        get_supabase()
        .table("events")
        .select(
            "event_id, title, description, location, start_time, end_time, "
            "registration_deadline, capacity, category_id, organizer_id, "
            "event_status, approval_status, file_url"
        )
        .eq("event_status", "PUBLISHED")
        .eq("approval_status", "APPROVED")
        .gte("end_time", now)
        .order("start_time", desc=False)
        .limit(limit)
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
    """events.event_id -> số lượt đăng ký còn hiệu lực (bỏ CANCELLED, WAITLISTED).

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
        if str(row.get("registration_status") or "").upper() in _INACTIVE_REG_STATUSES:
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
        if "WAITLIST" in status:
            # Người trong danh sách chờ chưa có suất chính thức -> không tính là
            # "đã đăng ký". Gộp chung với waiting_list bên dưới.
            waiting.append(title)
        elif "CHECK" in status:
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
    for row in wait_res.data or []:
        title = (row.get("events") or {}).get("title")
        if title:
            waiting.append(title)

    def _dedupe(items: list[str]) -> list[str]:
        seen: set[str] = set()
        return [x for x in items if not (x in seen or seen.add(x))]

    return {
        "registered": _dedupe(registered),
        "checked_in": _dedupe(checked_in),
        "saved": _dedupe(saved),
        "waiting": _dedupe(waiting),
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
        signals = recommendation_service.get_student_signals(user_id)
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
# Lớp 1b — Nạp nội dung TỆP KẾ HOẠCH của sự kiện được hỏi (events.file_url)
# --------------------------------------------------------------------------- #
def _events_referenced(
    message: str,
    history: list[ChatTurn],
    events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Đoán câu hỏi đang nói về (những) sự kiện nào, dựa trên khớp tiêu đề.

    Chỉ khi xác định được sự kiện cụ thể ta mới tải tệp kế hoạch của nó — tránh
    tải tệp vô ích cho câu hỏi chung ("sắp tới có sự kiện nào?").
    """
    recent = " ".join(
        [message] + [t.text for t in history[-4:] if t.text]
    ).lower()
    if not recent.strip():
        return []
    recent_words = set(_WORD_RE.findall(recent))

    scored: list[tuple[float, dict[str, Any]]] = []
    for ev in events:
        title = (ev.get("title") or "").strip().lower()
        if not title or not ev.get("file_url"):
            continue
        if title in recent:
            scored.append((1000.0 + len(title), ev))
            continue
        # Từ "có nghĩa" trong tiêu đề: bỏ chữ quá ngắn và vài hư từ tiếng Việt.
        tokens = [w for w in _WORD_RE.findall(title) if len(w) >= 2 and w not in _TITLE_STOPWORDS]
        keywords = [w for w in tokens if not w.isdigit()]
        if not keywords:
            continue
        hits = sum(1 for w in keywords if w in recent_words)
        ratio = hits / len(keywords)
        strong = (hits >= 2 and ratio >= 0.5) or (len(keywords) <= 2 and hits == len(keywords))
        if strong:
            scored.append((float(hits) + ratio, ev))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [ev for _, ev in scored[:PLAN_MAX_EVENTS]]


def _extract_docx_text(data: bytes) -> str:
    """Trích văn bản từ .docx bằng thư viện chuẩn (docx = zip chứa word/document.xml)."""
    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        xml_bytes = zf.read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    paragraphs: list[str] = []
    for para in root.iter(f"{ns}p"):
        line = "".join(node.text for node in para.iter(f"{ns}t") if node.text).strip()
        if line:
            paragraphs.append(line)
    return "\n".join(paragraphs)


def _plan_url_allowed_hosts() -> set[str]:
    """Danh sách host được phép tải tệp kế hoạch.

    Mặc định chỉ gồm host của Supabase Storage dự án (từ SUPABASE_URL). Có thể
    thêm host cho CDN / tên miền tuỳ chỉnh qua CHAT_PLAN_EXTRA_HOSTS (phân tách
    bằng dấu phẩy).
    """
    hosts: set[str] = set()
    supa_host = urlparse(os.getenv("SUPABASE_URL") or "").hostname
    if supa_host:
        hosts.add(supa_host.lower())
    for raw in (os.getenv("CHAT_PLAN_EXTRA_HOSTS") or "").split(","):
        host = raw.strip().lower()
        if host:
            hosts.add(host)
    return hosts


def _is_safe_plan_url(url: str) -> bool:
    """Chống SSRF: file_url do ban tổ chức nhập, chưa chắc là URL storage hợp lệ.

    Chỉ chấp nhận http/https, chặn địa chỉ IP nội bộ/loopback/link-local và (khi
    có cấu hình allowlist) chỉ cho phép đúng host của Supabase Storage dự án.
    """
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.hostname or "").lower()
    if not host:
        return False
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None
    if ip is not None and (
        ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
    ):
        return False
    allowed = _plan_url_allowed_hosts()
    if allowed:
        return host in allowed
    # Thiếu SUPABASE_URL (vd môi trường dev): vẫn đã chặn IP nội bộ ở trên,
    # chỉ từ chối khi host là một literal IP công khai.
    return ip is None


def _download_plan(url: str) -> Optional[bytes]:
    if not _is_safe_plan_url(url):
        logger.warning("Bỏ qua tệp kế hoạch có URL không được phép: %s", url)
        return None
    try:
        resp = httpx.get(url, timeout=PLAN_DOWNLOAD_TIMEOUT, follow_redirects=False)
        if resp.is_redirect:
            logger.warning("Tệp kế hoạch trả về chuyển hướng, bỏ qua: %s", url)
            return None
        resp.raise_for_status()
    except Exception:  # noqa: BLE001
        logger.exception("Không tải được tệp kế hoạch: %s", url)
        return None
    data = resp.content or b""
    if not data or len(data) > PLAN_MAX_BYTES:
        logger.warning("Bỏ qua tệp kế hoạch rỗng/quá lớn (%s bytes): %s", len(data), url)
        return None
    return data


def _load_event_plan(file_url: Optional[str]) -> Optional[dict[str, Any]]:
    """Tải + chuẩn hoá tệp kế hoạch của một sự kiện.

    - .docx -> {"kind": "text", "text": <đã cắt độ dài>}
    - .pdf  -> {"kind": "pdf",  "pdf": <bytes>}  (gửi thẳng cho Gemini)
    Trả None nếu không có tệp / tải lỗi / định dạng không hỗ trợ.
    """
    if not file_url:
        return None
    if file_url in _PLAN_CACHE:
        _PLAN_CACHE.move_to_end(file_url)
        return _PLAN_CACHE[file_url]

    result: Optional[dict[str, Any]] = None
    lowered = file_url.lower().split("?", 1)[0]
    data = _download_plan(file_url)
    if data is not None:
        try:
            if lowered.endswith(".pdf") or data[:5] == b"%PDF-":
                result = {"kind": "pdf", "pdf": data}
            elif lowered.endswith(".docx") or data[:2] == b"PK":
                text = _extract_docx_text(data).strip()
                if text:
                    result = {"kind": "text", "text": text[:PLAN_CONTEXT_MAX_CHARS]}
        except Exception:  # noqa: BLE001
            logger.exception("Không đọc được nội dung tệp kế hoạch: %s", file_url)
            result = None

    _PLAN_CACHE[file_url] = result
    _PLAN_CACHE.move_to_end(file_url)
    while len(_PLAN_CACHE) > _PLAN_CACHE_MAX:
        _PLAN_CACHE.popitem(last=False)
    return result


def _build_plan_context(
    message: str,
    history: list[ChatTurn],
    events: list[dict[str, Any]],
) -> tuple[Optional[str], list[dict[str, Any]]]:
    """Trả (khối văn bản kế hoạch, danh sách part PDF đính kèm) cho Gemini."""
    text_blocks: list[str] = []
    pdf_parts: list[dict[str, Any]] = []
    pdf_budget = PLAN_PDF_TOTAL_BYTES
    try:
        referenced = _events_referenced(message, history, events)
    except Exception:  # noqa: BLE001
        logger.exception("Lỗi khi dò sự kiện được hỏi cho chatbox.")
        referenced = []

    for ev in referenced:
        plan = _load_event_plan(ev.get("file_url"))
        if not plan:
            continue
        title = ev.get("title") or "sự kiện"
        if plan["kind"] == "text":
            text_blocks.append(f'### Kế hoạch sự kiện "{title}":\n{plan["text"]}')
        elif plan["kind"] == "pdf" and len(plan["pdf"]) <= pdf_budget:
            pdf_budget -= len(plan["pdf"])
            text_blocks.append(
                f'### Kế hoạch sự kiện "{title}": xem tệp PDF đính kèm bên dưới.'
            )
            pdf_parts.append(
                {"inline_data": {"mime_type": _PDF_MIME, "data": plan["pdf"]}}
            )

    return ("\n\n".join(text_blocks) or None), pdf_parts


# --------------------------------------------------------------------------- #
# Lớp 2 — Gọi Gemini để sinh câu trả lời có cấu trúc
# --------------------------------------------------------------------------- #
def _build_contents(
    payload: ChatMessageIn,
    events_context: str,
    user_profile_context: Optional[str] = None,
    plan_context: Optional[str] = None,
    plan_pdf_parts: Optional[list[dict[str, Any]]] = None,
) -> list[dict[str, Any]]:
    """Ghép lịch sử hội thoại + hồ sơ người dùng + ngữ cảnh dữ liệu cho Gemini."""
    contents: list[dict[str, Any]] = []
    history = list(payload.history[-HISTORY_TURN_LIMIT:])
    # Gemini yêu cầu lượt đầu tiên phải là "user"; bỏ các lượt "ai" mở đầu
    # (ví dụ lời chào của trợ lý mà frontend gửi kèm) để tránh lỗi 400.
    while history and history[0].role != "user":
        history.pop(0)
    for turn in history:
        contents.append(
            {
                "role": "user" if turn.role == "user" else "model",
                "parts": [{"text": turn.text}],
            }
        )

    today = now_naive_local().strftime("%Y-%m-%d %H:%M")
    profile_block = (
        f"HỒ SƠ NGƯỜI DÙNG (đã đăng nhập):\n{user_profile_context}\n\n"
        if user_profile_context
        else "HỒ SƠ NGƯỜI DÙNG: (chưa đăng nhập hoặc chưa có thông tin)\n\n"
    )
    plan_block = (
        "KẾ HOẠCH CHI TIẾT SỰ KIỆN (trích từ tệp kế hoạch do ban tổ chức tải lên — "
        "được phép dùng để trả lời chi tiết về đúng (các) sự kiện này):\n"
        f"{plan_context}\n\n"
        if plan_context
        else ""
    )
    final_user_text = (
        f"Hôm nay là {today}.\n\n"
        f"{profile_block}"
        f"DỮ LIỆU SỰ KIỆN (chỉ được dùng thông tin dưới đây khi nói về sự kiện cụ thể):\n"
        f"{events_context}\n\n"
        f"{plan_block}"
        f"CÂU HỎI CỦA NGƯỜI DÙNG:\n{payload.message}"
    )
    parts: list[dict[str, Any]] = [{"text": final_user_text}]
    parts.extend(plan_pdf_parts or [])
    contents.append({"role": "user", "parts": parts})
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

    # KHÔNG đặt max_output_tokens: các alias flash mới (vd gemini-flash-latest)
    # bật "thinking" sẵn và tiêu gần hết hạn mức token cho phần suy luận nội bộ,
    # khiến response.text rỗng hoặc JSON bị cắt giữa chừng (finish_reason=
    # MAX_TOKENS) — xem cảnh báo trong ai_description_service.py. JSON cần sinh ở
    # đây rất ngắn nên mặc định (vài nghìn token) của model là quá đủ.
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0,
        response_mime_type="application/json",
        response_schema=_LlmChatResult,
    )

    try:
        client = genai.Client(api_key=api_key)
    except Exception:  # noqa: BLE001
        logger.exception("Không khởi tạo được client google-genai cho chatbox.")
        return None

    for model in candidates:
        try:
            response = client.models.generate_content(
                model=model, contents=contents, config=config
            )
        except Exception:  # noqa: BLE001
            logger.exception("Gọi Gemini (model=%s) cho chatbox thất bại.", model)
            continue

        raw = (response.text or "").strip()
        finish = ""
        cands = getattr(response, "candidates", None)
        if cands:
            finish = str(getattr(cands[0], "finish_reason", "") or "")
        if not raw:
            logger.warning(
                "Gemini (model=%s) không trả về nội dung (finish_reason=%s) — "
                "thử model kế tiếp.",
                model,
                finish or "?",
            )
            continue
        try:
            return _LlmChatResult.model_validate_json(raw)
        except Exception:  # noqa: BLE001
            logger.warning(
                "Gemini (model=%s) trả JSON không hợp lệ (finish_reason=%s, "
                "%d ký tự) — thử model kế tiếp.",
                model,
                finish or "?",
                len(raw),
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

    # Nếu câu hỏi nói về một sự kiện cụ thể: nạp nội dung tệp kế hoạch (file_url)
    # của sự kiện đó để trả lời chi tiết (lịch trình, thể lệ, giải thưởng...).
    try:
        plan_context, plan_pdf_parts = _build_plan_context(
            payload.message, payload.history, events
        )
    except Exception:  # noqa: BLE001
        logger.exception("Không nạp được kế hoạch chi tiết cho chatbox.")
        plan_context, plan_pdf_parts = None, []

    contents = _build_contents(
        payload,
        events_context,
        user_profile_context,
        plan_context,
        plan_pdf_parts,
    )

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
