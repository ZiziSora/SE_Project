"""Yêu cầu chỉnh sửa sự kiện đã duyệt — tạo, so sánh, xét duyệt.

Nghiệp vụ:
    Sự kiện ĐANG CÔNG KHAI (PUBLISHED) mà Ban tổ chức sửa nội dung thì dữ liệu
    mới KHÔNG ghi đè lên bảng `events` nữa mà được ghi vào bảng
    `event_revisions`. Bảng `events` chỉ đổi khi Admin bấm duyệt.

    Giá trị CŨ không lưu lại: chừng nào bản sửa còn chờ duyệt thì `events` vẫn
    đang giữ đúng nội dung cũ, nên bảng so sánh "cũ → mới" được tính bằng cách
    đối chiếu bản sửa với dòng `events` tương ứng (`changed_fields`).

Nhờ vậy:
    * Admin thấy được "giá trị cũ → giá trị mới" thay vì chỉ thấy bản mới.
    * Sinh viên vẫn xem và đăng ký được bản đang chạy trong lúc chờ duyệt.

Tầng này là nơi DUY NHẤT đụng tới bảng `event_revisions`.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.core.config import (
    TABLE_CATEGORIES,
    TABLE_EVENT_REVISIONS,
    TABLE_EVENTS,
)
from app.core.supabase_client import get_supabase
from app.models.enum import NotificationType
from app.schemas.event_revision import EventRevisionOut, FieldChange
from app.services import notification_service, registration_service

logger = logging.getLogger(__name__)

# Các trường được phép nằm trong một yêu cầu chỉnh sửa, kèm nhãn tiếng Việt.
# Thứ tự ở đây cũng là thứ tự hiển thị trong bảng so sánh của Admin.
REVISION_FIELDS: dict[str, str] = {
    "title": "Tên sự kiện",
    "category_id": "Lĩnh vực / Danh mục",
    "location": "Địa điểm",
    "start_time": "Thời gian bắt đầu",
    "end_time": "Thời gian kết thúc",
    "registration_deadline": "Hạn chót đăng ký",
    "capacity": "Sức chứa",
    "description": "Mô tả sự kiện",
    "banner_url": "Ảnh bìa",
    "file_url": "Tệp kế hoạch sự kiện",
}

DATETIME_FIELDS = {"start_time", "end_time", "registration_deadline"}
NUMBER_FIELDS = {"category_id", "capacity"}
URL_FIELDS = {"banner_url", "file_url"}

# Giá trị của enum `revision_status` trong Postgres (chữ hoa)
PENDING = "PENDING"
APPROVED = "APPROVED"
REJECTED = "REJECTED"
SUPERSEDED = "SUPERSEDED"

EMPTY_TEXT = "(để trống)"

# Nhãn tiếng Việt của 6 trạng thái sự kiện — chỉ dùng để dựng câu thông báo lỗi
# cho Admin khi bản sửa không còn áp dụng được.
EVENT_STATUS_LABELS: dict[str, str] = {
    "DRAFT": "Bản nháp",
    "PENDING": "Chờ duyệt",
    "PUBLISHED": "Đã công khai",
    "ONGOING": "Đang diễn ra",
    "ENDED": "Đã kết thúc",
    "CANCELLED": "Đã huỷ",
}


# ─── Đọc ──────────────────────────────────────────────────────────────────────


def get_pending_revision(event_id: str) -> Optional[dict[str, Any]]:
    """Yêu cầu chỉnh sửa đang chờ duyệt của một sự kiện (nếu có).

    Đường ĐỌC nên khoan dung: nếu bảng `event_revisions` chưa được tạo (chưa
    tạo trực tiếp trên Supabase) thì coi như chưa có yêu cầu nào, để phần
    còn lại của hệ thống vẫn chạy bình thường. Đường GHI
    (`submit_revision`) thì ngược lại — phải báo lỗi rõ ràng.
    """
    if not event_id:
        return None
    try:
        res = (
            get_supabase()
            .table(TABLE_EVENT_REVISIONS)
            .select("*")
            .eq("event_id", event_id)
            .eq("status", PENDING)
            .limit(1)
            .execute()
        )
    except Exception:  # noqa: BLE001
        return None
    return res.data[0] if res.data else None


def events_with_pending_revision(event_ids: list[str]) -> set[str]:
    """Lọc ra những sự kiện đang có yêu cầu chỉnh sửa chờ duyệt.

    Gọi một lần cho cả trang danh sách thay vì hỏi từng dòng.
    """
    ids = [i for i in event_ids if i]
    if not ids:
        return set()
    # Cũng khoan dung như `get_pending_revision`: bảng chưa tạo thì danh sách sự
    # kiện vẫn hiển thị được, chỉ là không có nhãn "Chờ duyệt thay đổi".
    try:
        res = (
            get_supabase()
            .table(TABLE_EVENT_REVISIONS)
            .select("event_id")
            .in_("event_id", ids)
            .eq("status", PENDING)
            .execute()
        )
    except Exception:  # noqa: BLE001
        return set()
    return {str(row["event_id"]) for row in (res.data or [])}


def list_revisions(event_id: str) -> list[dict[str, Any]]:
    """Lịch sử chỉnh sửa của một sự kiện, mới nhất trước."""
    res = _run(
        get_supabase()
        .table(TABLE_EVENT_REVISIONS)
        .select("*")
        .eq("event_id", event_id)
        .order("submitted_at", desc=True)
    )
    return res.data or []


def list_pending_for_admin() -> list[EventRevisionOut]:
    """Hàng chờ duyệt thay đổi của Admin, kèm tên sự kiện và tên Ban tổ chức."""
    res = _run(
        get_supabase()
        .table(TABLE_EVENT_REVISIONS)
        .select("*")
        .eq("status", PENDING)
        .order("submitted_at", desc=False)
    )
    rows = res.data or []
    if not rows:
        return []

    # Lấy nguyên dòng `events` chứ không chỉ vài cột: đó chính là nguồn giá trị
    # CŨ để dựng bảng so sánh.
    events = _events_by_id([str(row["event_id"]) for row in rows])
    organizers = _organizers(
        [str(event.get("organizer_id")) for event in events.values()]
    )
    categories = _category_map()

    items: list[EventRevisionOut] = []
    for row in rows:
        event = events.get(str(row["event_id"]), {})
        organizer = organizers.get(str(event.get("organizer_id")), {})
        items.append(
            to_out(
                row,
                categories,
                current_event=event,
                event_title=event.get("title"),
                organizer_name=organizer.get("full_name"),
                organizer_department=organizer.get("department_name"),
            )
        )
    return items


# ─── Ghi ──────────────────────────────────────────────────────────────────────


def submit_revision(
    *,
    event_id: str,
    organizer_id: str,
    new_data: dict[str, Any],
    current: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Ghi nhận một yêu cầu chỉnh sửa. Trả về None nếu không có gì thay đổi.

    `new_data` là những trường client vừa gửi lên, `current` là dòng hiện tại
    trong bảng `events`. Bản ghi lưu TOÀN BỘ phần nội dung sau khi trộn (chứ
    không chỉ phần đổi) để lúc Admin duyệt chỉ việc copy sang bảng `events`.
    Giá trị cũ không cần lưu — `events` vẫn đang giữ nguyên nó.
    """
    changed = changed_fields(new_data, current)
    if not changed:
        return None

    content = {
        field: _json_safe(
            new_data[field] if field in new_data else current.get(field)
        )
        for field in REVISION_FIELDS
    }

    # Mở lại form rồi bấm Lưu mà không sửa gì thêm: nội dung trùng đúng bản đang
    # chờ duyệt, giữ nguyên bản cũ thay vì sinh thêm một bản y hệt.
    existing = get_pending_revision(event_id)
    if existing is not None and not changed_fields(content, existing):
        return existing

    # Bản sửa cũ còn đang chờ duyệt thì bị bản mới thay thế — giữ lại làm lịch sử
    # thay vì xoá, và nhờ vậy partial unique index "1 bản PENDING" vẫn thoả.
    _supersede_pending(event_id)

    payload: dict[str, Any] = {
        "event_id": event_id,
        "submitted_by": organizer_id,
        "status": PENDING,
        **content,
    }

    res = _run(get_supabase().table(TABLE_EVENT_REVISIONS).insert(payload))
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không lưu được yêu cầu chỉnh sửa.",
        )
    return res.data[0]


def cancel_pending_revision(event_id: str) -> bool:
    """Ban tổ chức tự rút lại yêu cầu chỉnh sửa. True nếu có bản để rút."""
    if get_pending_revision(event_id) is None:
        return False
    _supersede_pending(event_id)
    return True


def approve_revision(revision_id: str) -> EventRevisionOut:
    """Admin duyệt: copy dữ liệu mới sang bảng `events`."""
    revision = _get_pending_by_id(revision_id)

    # Đọc dòng events TRƯỚC khi ghi đè — sau khi update thì không còn giá trị cũ
    # nào để dựng bảng so sánh trả về cho giao diện nữa.
    before = _event_row(str(revision["event_id"]))

    # Bản sửa được kiểm tra lúc GỬI, nhưng chỉ được GHI ở đây. Trạng thái hệ
    # thống có thể đã đổi trong khoảng giữa, nên phải kiểm tra lại từ đầu.
    _revalidate_before_apply(revision, before)

    updates = {field: revision.get(field) for field in REVISION_FIELDS}
    _run(
        get_supabase()
        .table(TABLE_EVENTS)
        .update(updates)
        .eq("event_id", revision["event_id"])
    )

    row = _finish_review(revision_id, APPROVED)
    out = to_out(row, _category_map(), current_event=before)
    _notify_revision_approved(revision, before)
    _promote_waitlist_if_capacity_raised(revision, before)
    return out


def _revalidate_before_apply(
    revision: dict[str, Any], before: Optional[dict[str, Any]]
) -> None:
    """Kiểm tra lại toàn bộ ràng buộc NGAY TRƯỚC KHI ghi đè bảng `events`.

    Vì sao cần: bản sửa được kiểm tra ở thời điểm Ban tổ chức GỬI, nhưng chỉ
    được ghi xuống ở thời điểm Admin DUYỆT — có thể là nhiều ngày sau. Giữa hai
    mốc đó sinh viên vẫn đăng ký được (bảng `events` còn giữ nội dung CŨ nên
    không có gì chặn) và thời gian vẫn trôi, nên kết quả kiểm tra cũ có thể đã
    hết hiệu lực. Đây là lỗi TOCTOU (Time-Of-Check to Time-Of-Use); cách chữa là
    đặt ràng buộc ở điểm GHI chứ không chỉ ở điểm nhận yêu cầu.

    Ba tình huống bị chặn ở đây:

    * Sức chứa mới nhỏ hơn số người ĐANG đăng ký (có người đăng ký thêm sau khi
      bản sửa được gửi).
    * Mốc thời gian mới đã trôi qua trong lúc chờ duyệt.
    * Sự kiện đã bắt đầu / kết thúc / bị huỷ trong lúc chờ duyệt.

    Không tự động từ chối bản sửa: quyền quyết định vẫn thuộc về Admin, hàm này
    chỉ từ chối ÁP DỤNG và nói rõ lý do.
    """
    # Import cục bộ: `event_service` đã import module này ở đầu tệp nên import
    # ngược lại ở top-level sẽ tạo vòng phụ thuộc.
    from app.services import event_service

    if not before:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sự kiện của yêu cầu chỉnh sửa này không còn tồn tại.",
        )

    event_id = str(revision["event_id"])

    # Chỉ sự kiện ĐÃ CÔNG KHAI VÀ CHƯA BẮT ĐẦU mới có bản sửa để áp dụng.
    current_status = event_service.get_ui_status(before)
    if current_status not in event_service.REAPPROVAL_STATUSES:
        label = EVENT_STATUS_LABELS.get(current_status, current_status)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Không thể áp dụng bản sửa vì sự kiện hiện ở trạng thái "
                f"\u201c{label}\u201d. Hãy từ chối yêu cầu này."
            ),
        )

    # Chỉ xét những trường thực sự khác dòng `events` hiện tại.
    new_data = {field: revision.get(field) for field in REVISION_FIELDS}
    changes = {field: new_data[field] for field in changed_fields(new_data, before)}
    if not changes:
        return

    try:
        event_service.validate_pending_changes(event_id, changes, before)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Không thể duyệt: dữ liệu sự kiện đã thay đổi kể từ lúc Ban tổ "
                f"chức gửi yêu cầu. {detail} Hãy từ chối yêu cầu này và đề nghị "
                "Ban tổ chức gửi lại bản sửa mới."
            ),
        ) from exc


def _promote_waitlist_if_capacity_raised(
    revision: dict[str, Any],
    before: Optional[dict[str, Any]],
) -> None:
    """Bản sửa vừa duyệt làm tăng sức chứa → lấp ghế mới bằng danh sách chờ.

    Đây là đường duy nhất sức chứa của một sự kiện ĐANG CÔNG KHAI thay đổi, mà
    cũng chỉ sự kiện công khai mới có người xếp hàng chờ — nên bỏ sót chỗ này
    là danh sách chờ đứng im dù Ban tổ chức đã mở thêm chỗ.

    Không được làm hỏng việc duyệt: bản sửa đã áp dụng xong, lỗi chỉ ghi log.
    """
    old_capacity = _as_int((before or {}).get("capacity"))
    new_capacity = _as_int(revision.get("capacity"))
    if old_capacity is None:
        return
    if new_capacity is not None and new_capacity <= old_capacity:
        return

    event_id = str(revision.get("event_id") or "")
    if not event_id:
        return
    try:
        registration_service.promote_waitlisted(
            event_id,
            new_capacity,
            event_title=_revision_title(revision, before),
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Không đôn được danh sách chờ sau khi duyệt bản sửa sự kiện %s.",
            event_id,
        )


def reject_revision(revision_id: str) -> EventRevisionOut:
    """Admin từ chối: bảng `events` giữ nguyên bản đang chạy."""
    revision = _get_pending_by_id(revision_id)
    before = _event_row(str(revision["event_id"]))
    row = _finish_review(revision_id, REJECTED)
    out = to_out(row, _category_map(), current_event=before)
    _notify_revision_rejected(revision, before)
    return out


# ─── Thông báo kết quả xét duyệt ─────────────────────────────────────────────
#
# Kết quả duyệt phải đi tới HAI phía:
#   * Ban tổ chức gửi bản sửa — biết bản sửa được áp dụng hay bị từ chối.
#   * Sinh viên ĐÃ ĐĂNG KÝ — nội dung sự kiện họ đăng ký vừa đổi thật sự.
# Thông báo không được làm hỏng việc duyệt: mọi lỗi ở đây chỉ ghi log.


def _revision_title(
    revision: dict[str, Any],
    before: Optional[dict[str, Any]],
) -> str:
    return str(
        revision.get("title") or (before or {}).get("title") or "Sự kiện"
    )


def _revision_changed_fields(
    revision: dict[str, Any],
    before: Optional[dict[str, Any]],
) -> list[str]:
    """Những trường bản sửa thực sự làm đổi so với dòng `events` trước khi ghi."""
    new_data = {f: revision.get(f) for f in REVISION_FIELDS if f in revision}
    return changed_fields(new_data, before or {})


def _participant_notification_type(changed: list[str]) -> NotificationType:
    """Loại thông báo sát nhất với thứ vừa đổi, để sinh viên đọc lướt là biết."""
    fields = set(changed)
    if fields == {"location"}:
        return NotificationType.EVENT_LOCATION_CHANGED
    if fields and fields <= {"start_time", "end_time", "registration_deadline"}:
        return NotificationType.EVENT_TIME_CHANGED
    return NotificationType.EVENT_UPDATED


def _notify_revision_approved(
    revision: dict[str, Any],
    before: Optional[dict[str, Any]],
) -> None:
    event_id = str(revision.get("event_id") or "")
    title = _revision_title(revision, before)
    changed = _revision_changed_fields(revision, before)
    labels = [REVISION_FIELDS[field] for field in changed]

    _notify_organizer(
        revision,
        event_id=event_id,
        notification_type=NotificationType.EVENT_APPROVED,
        title="Thay đổi sự kiện đã được duyệt",
        content=(
            f'Yêu cầu chỉnh sửa sự kiện "{title}" đã được duyệt và áp dụng'
            + (f" ({', '.join(labels)})." if labels else ".")
        ),
    )

    if not event_id or not changed:
        return
    try:
        notification_service.notify_event_participants(
            event_id=event_id,
            notification_type=_participant_notification_type(changed),
            title=f"Cập nhật sự kiện: {title}",
            content=(
                f'Sự kiện "{title}" bạn đã đăng ký vừa được cập nhật: '
                f"{', '.join(labels)}. Vui lòng xem lại thông tin mới nhất."
            ),
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Không gửi được thông báo cập nhật sự kiện %s cho sinh viên.",
            event_id,
        )


def _notify_revision_rejected(
    revision: dict[str, Any],
    before: Optional[dict[str, Any]],
) -> None:
    title = _revision_title(revision, before)
    _notify_organizer(
        revision,
        event_id=str(revision.get("event_id") or ""),
        notification_type=NotificationType.EVENT_REJECTED,
        title="Thay đổi sự kiện chưa được duyệt",
        content=(
            f'Yêu cầu chỉnh sửa sự kiện "{title}" đã bị từ chối. '
            "Sự kiện vẫn giữ nguyên nội dung đang công khai."
        ),
    )


def _notify_organizer(
    revision: dict[str, Any],
    *,
    event_id: str,
    notification_type: NotificationType,
    title: str,
    content: str,
) -> None:
    organizer_id = revision.get("submitted_by")
    if not organizer_id:
        return
    try:
        notification_service.create_notification(
            user_id=str(organizer_id),
            event_id=event_id or None,
            notification_type=notification_type,
            title=title,
            content=content,
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Không gửi được thông báo kết quả duyệt bản sửa %s.",
            revision.get("revision_id"),
        )


# ─── So sánh cũ / mới ─────────────────────────────────────────────────────────


def changed_fields(
    new_data: dict[str, Any],
    current: dict[str, Any],
) -> list[str]:
    """Danh sách trường thực sự thay đổi, theo thứ tự của `REVISION_FIELDS`."""
    return [
        field
        for field in REVISION_FIELDS
        if field in new_data
        and _differs(field, new_data.get(field), current.get(field))
    ]


def _differs(field: str, new_value: Any, old_value: Any) -> bool:
    """So sánh có chuẩn hoá, tránh tạo bản sửa "ma".

    Không so sánh chuỗi thô được: client gửi "2026-08-20T07:20:00" còn Supabase
    trả "2026-08-20T07:20:00+00:00" — cùng một mốc nhưng khác chuỗi. Sức chứa
    cũng có thể về dạng "200" thay vì 200.
    """
    if field in DATETIME_FIELDS:
        new_dt = _naive(_parse_dt(new_value))
        old_dt = _naive(_parse_dt(old_value))
        if new_dt is None or old_dt is None:
            return new_dt is not old_dt
        # Lệch dưới 1 giây coi như không đổi (chênh phần mili giây của chuỗi ISO)
        return abs(new_dt - old_dt) >= timedelta(seconds=1)

    if field in NUMBER_FIELDS:
        return _as_int(new_value) != _as_int(old_value)

    return _as_text(new_value) != _as_text(old_value)


def to_out(
    row: dict[str, Any],
    categories: Optional[dict[int, str]] = None,
    *,
    current_event: Optional[dict[str, Any]] = None,
    event_title: Optional[str] = None,
    organizer_name: Optional[str] = None,
    organizer_department: Optional[str] = None,
) -> EventRevisionOut:
    """Chuyển một dòng DB thành dữ liệu API, kèm bảng so sánh đã định dạng.

    `current_event` là dòng `events` tương ứng — nguồn giá trị CŨ. Không truyền
    thì `changes` rỗng (bản ghi vẫn dùng được, chỉ không có bảng so sánh).
    """
    categories = categories if categories is not None else {}
    content = {field: row.get(field) for field in REVISION_FIELDS}
    fields = changed_fields(content, current_event) if current_event else []

    changes = [
        FieldChange(
            field=field,
            label=REVISION_FIELDS[field],
            old=current_event.get(field),
            new=row.get(field),
            old_text=format_value(field, current_event.get(field), categories),
            new_text=format_value(field, row.get(field), categories),
        )
        for field in fields
    ]

    return EventRevisionOut(
        revision_id=str(row.get("revision_id")),
        event_id=str(row.get("event_id")),
        status=str(row.get("status") or PENDING),
        submitted_by=_str_or_none(row.get("submitted_by")),
        submitted_at=_parse_dt(row.get("submitted_at")),
        changed_fields=[change.field for change in changes],
        changes=changes,
        values=content,
        event_title=event_title,
        organizer_name=organizer_name,
        organizer_department=organizer_department,
        category_name=categories.get(_as_int(content.get("category_id"))),
    )


def format_value(
    field: str,
    value: Any,
    categories: Optional[dict[int, str]] = None,
) -> str:
    """Đưa giá trị thô về chuỗi tiếng Việt để hiển thị trong bảng so sánh."""
    categories = categories or {}

    if field == "capacity" and value in (None, ""):
        return "Không giới hạn"
    if value is None or (isinstance(value, str) and not value.strip()):
        return EMPTY_TEXT

    if field in DATETIME_FIELDS:
        parsed = _parse_dt(value)
        return parsed.strftime("%d/%m/%Y %H:%M") if parsed else str(value)

    if field == "category_id":
        number = _as_int(value)
        return categories.get(number, f"Danh mục #{number}")

    if field == "capacity":
        return f"{_as_int(value):,} người".replace(",", ".")

    if field in URL_FIELDS:
        return _file_name(str(value))

    return str(value)


# ─── Internal helpers ─────────────────────────────────────────────────────────


def _run(query):
    """Thực thi query Supabase, đổi lỗi thành HTTPException dễ đọc."""
    try:
        return query.execute()
    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi cơ sở dữ liệu: {exc.message}",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Không kết nối được Supabase: {exc}",
        ) from exc


def _supersede_pending(event_id: str) -> None:
    """Đánh dấu bản đang chờ là đã bị thay thế / rút lại (giữ lại làm lịch sử)."""
    _run(
        get_supabase()
        .table(TABLE_EVENT_REVISIONS)
        .update({"status": SUPERSEDED})
        .eq("event_id", event_id)
        .eq("status", PENDING)
    )


def _get_pending_by_id(revision_id: str) -> dict[str, Any]:
    res = _run(
        get_supabase()
        .table(TABLE_EVENT_REVISIONS)
        .select("*")
        .eq("revision_id", revision_id)
        .limit(1)
    )
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu chỉnh sửa.",
        )
    revision = res.data[0]
    if str(revision.get("status")) != PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Yêu cầu chỉnh sửa này đã được xử lý trước đó.",
        )
    return revision


def _finish_review(revision_id: str, new_status: str) -> dict[str, Any]:
    """Chốt kết quả xét duyệt — chỉ đổi `status`, bảng không lưu gì thêm."""
    updates = {"status": new_status}
    res = _run(
        get_supabase()
        .table(TABLE_EVENT_REVISIONS)
        .update(updates)
        .eq("revision_id", revision_id)
    )
    return res.data[0] if res.data else {"revision_id": revision_id, **updates}


def _event_row(event_id: str) -> Optional[dict[str, Any]]:
    """Dòng `events` hiện tại — nguồn giá trị CŨ cho bảng so sánh."""
    res = _run(
        get_supabase()
        .table(TABLE_EVENTS)
        .select("*")
        .eq("event_id", event_id)
        .limit(1)
    )
    return res.data[0] if res.data else None


def _events_by_id(event_ids: list[str]) -> dict[str, dict[str, Any]]:
    ids = [i for i in event_ids if i]
    if not ids:
        return {}
    res = _run(
        get_supabase()
        .table(TABLE_EVENTS)
        .select("*")
        .in_("event_id", ids)
    )
    return {str(row["event_id"]): row for row in (res.data or [])}


def _organizers(user_ids: list[str]) -> dict[str, dict[str, Any]]:
    """Tên và đơn vị của Ban tổ chức, để hàng chờ của Admin hiển thị đủ ngữ cảnh."""
    ids = [i for i in user_ids if i and i != "None"]
    if not ids:
        return {}
    try:
        res = (
            get_supabase()
            .table("users")
            .select("user_id, full_name, department_name")
            .in_("user_id", ids)
            .execute()
        )
    except Exception:  # noqa: BLE001
        return {}
    return {str(row["user_id"]): row for row in (res.data or [])}


def _category_map() -> dict[int, str]:
    try:
        res = (
            get_supabase()
            .table(TABLE_CATEGORIES)
            .select("category_id, name")
            .execute()
        )
    except Exception:  # noqa: BLE001
        return {}
    return {row["category_id"]: row["name"] for row in (res.data or [])}


def _parse_dt(value: Any) -> Optional[datetime]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _naive(dt: Optional[datetime]) -> Optional[datetime]:
    """Đưa về naive UTC — quy ước dùng chung với `event_service`."""
    if dt and dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _as_int(value: Any) -> Optional[int]:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _as_text(value: Any) -> str:
    """Chuẩn hoá về chuỗi: None và "" được coi là như nhau."""
    if value is None:
        return ""
    return str(value).strip()


def _json_safe(value: Any) -> Any:
    """datetime không serialise được sang JSON — đổi sang chuỗi ISO."""
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _str_or_none(value: Any) -> Optional[str]:
    return None if value in (None, "") else str(value)


def _file_name(url: str) -> str:
    from urllib.parse import unquote, urlparse

    name = unquote(urlparse(url).path.split("/")[-1])
    return name or url
