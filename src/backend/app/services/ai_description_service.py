"""Sinh / hoàn thiện mô tả sự kiện bằng Gemini API.

Hai chế độ, quyết định bởi việc ô mô tả trên form có nội dung hay chưa:

* `current_description` trống  -> **viết mới**: AI tự soạn mô tả từ các thông
  tin đã nhập (tên, danh mục, địa điểm, thời gian, sức chứa).
* `current_description` có chữ -> **hoàn thiện**: AI viết lại cho mạch lạc,
  chuyên nghiệp hơn nhưng phải giữ nguyên mọi ý và dữ kiện người dùng đã ghi.

Tính năng chỉ chạy khi Ban tổ chức bấm nút ở form — không có đường gọi nền.
Nếu thiếu `GEMINI_API_KEY`, chưa cài `google-genai`, hoặc gọi API lỗi thì trả
về lỗi HTTP rõ ràng để frontend hiển thị toast, KHÔNG chèn nội dung giả.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime

from fastapi import HTTPException, status

from app.schemas.organizer_event import AIDescriptionIn

logger = logging.getLogger(__name__)

# KHÔNG dùng `gemini-flash-latest`: alias này hiện trỏ tới model có "thinking"
# bật sẵn — mỗi lần gọi mất 25–35 giây và thường tiêu hết `max_output_tokens`
# cho phần suy luận nội bộ nên chỉ trả về 1 câu cụt (finish_reason=MAX_TOKENS).
# `gemini-3.5-flash-lite` không suy luận lan man, phản hồi ~1–2 giây, đủ tốt cho
# tác vụ viết 1 đoạn mô tả. Ghi đè bằng biến môi trường GEMINI_MODEL nếu cần.
# (`gemini-2.5-flash-lite` cũ đã bị Google gỡ, trả 404.)
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"

SYSTEM_INSTRUCTION = (
    "Bạn là người viết nội dung truyền thông cho các câu lạc bộ / ban tổ chức "
    "sự kiện sinh viên. Văn phong tiếng Việt ấm áp, gần gũi, giàu cảm xúc; xưng "
    '"tụi mình / chúng mình" và gọi người đọc là "bạn". Mỗi đoạn mở đầu bằng một '
    "emoji phù hợp (ví dụ 💗 ❣️ 😍 🥰 🙌 ✨ 🎯 🤝), không nhồi nhiều emoji trong "
    "cùng một câu. Tuyệt đối chỉ dùng dữ kiện được cung cấp — không bịa diễn giả, "
    "chi phí, quà tặng, con số, đối tác hay lịch trình không có trong thông tin. "
    "Chỉ trả về phần nội dung mô tả theo đúng bố cục được yêu cầu, không thêm lời "
    "dẫn, ghi chú hay giải thích."
)

# Mẫu văn phong để model bắt chước giọng điệu & bố cục (few-shot). KHÔNG phải để
# sao chép nội dung — mọi sự kiện thật đều khác hẳn ví dụ này.
_STYLE_SAMPLE = (
    "💗 WORKSHOP: JEWELS OF JOY ♥️ - TỰ TAY TẠO NIỀM VUI, CÙNG NHAU GIỮ KỈ NIỆM\n"
    "❣️ Người ta thường nói: “Món quà quý nhất không nằm ở giá trị, mà nằm ở tấm "
    "lòng của người làm ra.” Đã bao lâu rồi bạn chưa tự tay làm một món quà nhỏ? "
    "Hãy cùng tụi mình kết nối những hạt charms xinh xắn thành chiếc vòng tay "
    "mang phong cách của riêng bạn nhé!\n"
    "😍 Đến với workshop, bạn được thả mình vào thế giới sắc màu. Đừng ngại nếu "
    "đây là lần đầu bạn chạm tay vào những hạt cườm — tụi mình đã chuẩn bị sẵn "
    "hình mẫu cùng đội ngũ CTV nhiệt tình, luôn ngồi bên cạnh hướng dẫn từng nút thắt.\n"
    "🥰 Tụi mình tin chiếc vòng ưng ý nhất nằm ở niềm vui khi bạn dồn hết tâm trí "
    "để tạo ra nó, dù là cho bản thân hay một người đặc biệt.\n"
    "📌 Thông tin chi tiết:\n"
    "⌛ Thời gian: 08:30–16:00 ngày 11/04/2026\n"
    "🏫 Địa điểm: Sảnh tòa I, Trường ĐH Khoa học Tự nhiên, 227 Nguyễn Văn Cừ"
)

_LAYOUT = (
    "Bố cục bắt buộc (giữ nguyên các dòng 📌 ⌛ 🏫):\n"
    "<emoji> TÊN SỰ KIỆN (viết hoa) - <tagline ngắn gọn>\n"
    "<emoji> Đoạn mở đầu 2-3 câu: một câu dẫn dắt cảm xúc hoặc câu hỏi gợi mở, "
    "rồi lời mời tham gia.\n"
    "<emoji> Đoạn 2 (3-4 câu): trải nghiệm và hoạt động chính, trấn an người "
    "lần đầu tham gia.\n"
    "<emoji> Đoạn 3 (2-3 câu): ý nghĩa / thông điệp sự kiện muốn lan tỏa, kèm "
    "một câu mời đăng ký.\n"
    "📌 Thông tin chi tiết:\n"
    "⌛ Thời gian: <lấy đúng từ Thông tin sự kiện; nếu không có thì BỎ HẲN dòng này>\n"
    "🏫 Địa điểm: <lấy đúng từ Thông tin sự kiện; nếu không có thì BỎ HẲN dòng này>\n"
    "Không ghi \"đang cập nhật\" cho phần còn thiếu. Không thêm dòng thông tin nào "
    "ngoài thời gian, địa điểm và (nếu có) sức chứa."
)


def _fmt_dt(dt: datetime) -> str:
    return f"{dt:%H:%M} ngày {dt:%d/%m/%Y}"


def _format_time_range(payload: AIDescriptionIn) -> str | None:
    start, end = payload.start_time, payload.end_time
    if start and end:
        if start.date() == end.date():
            return f"{start:%H:%M}–{end:%H:%M} ngày {start:%d/%m/%Y}"
        return f"{_fmt_dt(start)} - {_fmt_dt(end)}"
    if start:
        return _fmt_dt(start)
    if end:
        return _fmt_dt(end)
    return None


def _format_context(payload: AIDescriptionIn) -> str:
    lines = [f"- Tên sự kiện: {payload.title}"]
    if payload.category_name:
        lines.append(f"- Danh mục: {payload.category_name}")
    if payload.location:
        lines.append(f"- Địa điểm: {payload.location}")
    time_range = _format_time_range(payload)
    if time_range:
        lines.append(f"- Thời gian: {time_range}")
    if payload.capacity:
        lines.append(f"- Số lượng tham gia tối đa: {payload.capacity} người")
    return "\n".join(lines)


def _build_prompt(payload: AIDescriptionIn) -> str:
    context = _format_context(payload)
    current = (payload.current_description or "").strip()

    if current:
        task = (
            "Đoạn mô tả / ý chính hiện tại do Ban tổ chức viết:\n"
            f'"""\n{current}\n"""\n\n'
            "Hãy viết lại theo đúng bố cục bên dưới. GIỮ NGUYÊN mọi ý và dữ kiện "
            "Ban tổ chức đã nêu (tên quỹ từ thiện, tên đối tác, hoạt động cụ "
            "thể, con số...), chỉ trau chuốt câu chữ và sắp xếp lại cho mạch lạc, "
            "ấm áp hơn. Không thêm chi tiết mới.\n\n"
        )
    else:
        task = (
            "Hãy viết một đoạn mô tả sự kiện hoàn toàn mới theo đúng bố cục bên "
            "dưới, dài khoảng 150-220 từ.\n\n"
        )

    return (
        "Thông tin sự kiện:\n"
        f"{context}\n\n"
        f"{task}"
        f"{_LAYOUT}\n\n"
        "Tham khảo văn phong dưới đây (CHỈ học giọng điệu và cách trình bày, "
        "KHÔNG lấy lại bất kỳ chi tiết nào — sự kiện thật khác hoàn toàn):\n"
        f'"""\n{_STYLE_SAMPLE}\n"""'
    )


def generate_event_description(payload: AIDescriptionIn) -> str:
    """Trả về đoạn mô tả do AI sinh / hoàn thiện. Ném HTTPException nếu không chạy được."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tính năng viết mô tả bằng AI chưa được cấu hình (thiếu GEMINI_API_KEY).",
        )

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:  # pragma: no cover - phụ thuộc môi trường
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Thư viện google-genai chưa được cài đặt trên máy chủ.",
        ) from exc

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    prompt = _build_prompt(payload)

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.85,
                # Không đặt max_output_tokens: 1 đoạn mô tả vốn ngắn (~300–500
                # token đầu ra), để model tự dừng ở `finish_reason=STOP` thay vì
                # bị cắt giữa câu. Mặc định của model (vài nghìn token) là quá đủ.
            ),
        )
        text = (response.text or "").strip()
        finish_reason = (
            response.candidates[0].finish_reason if response.candidates else None
        )
    except Exception as exc:  # noqa: BLE001 - gói mọi lỗi SDK/mạng thành 502
        logger.exception("Gọi Gemini API để sinh mô tả sự kiện thất bại.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không kết nối được dịch vụ AI, vui lòng thử lại sau.",
        ) from exc

    # Đoạn quá ngắn vì bị cắt token (thường do GEMINI_MODEL bị set sang model
    # "thinking") — coi như thất bại, đừng trả về câu cụt.
    if str(finish_reason).endswith("MAX_TOKENS") and len(text) < 80:
        logger.error(
            "Gemini bị cắt do MAX_TOKENS, chỉ trả về %d ký tự (model=%s). "
            "Kiểm tra biến GEMINI_MODEL.",
            len(text),
            model,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Dịch vụ AI phản hồi không hợp lệ, vui lòng thử lại.",
        )

    if not text:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Dịch vụ AI không trả về nội dung, vui lòng thử lại.",
        )
    return text
