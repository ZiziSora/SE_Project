"""Toàn bộ nghiệp vụ sự kiện: CRUD, thống kê, đếm người đăng ký, danh mục.

Đây là tầng duy nhất gọi Supabase. Router chỉ nhận request → gọi service → trả JSON.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.core.app_time import APP_TZ, now_naive_local
from app.core.config import (
    TABLE_CATEGORIES,
    TABLE_EVENT_REVISIONS,
    TABLE_EVENTS,
    TABLE_REGISTRATIONS,
)
from app.core.supabase_client import get_supabase
from app.models.enum import NotificationType
from app.schemas.category import CategoryOut
from app.schemas.event_revision import EventRevisionOut
from app.schemas.event import EventOut as PublicEventOut
from app.services import event_revision_service
from app.schemas.organizer_event import (
    EventCreate,
    EventListOut,
    EventStatus,
    EventUpdate,
    OrganizerEventOut,
    StatsOut,
    missing_required_fields,
)
from app.services import (
    notification_service,
    profile_services,
    registration_service,
)

# Các bảng con trỏ về `events.event_id`. Khoá ngoại của chúng trong DB chưa có
# ON DELETE CASCADE, nên xoá thẳng `events` sẽ bị Postgres chặn — phải tự dọn
# theo đúng thứ tự phụ thuộc. Ràng buộc khoá ngoại được chỉnh trực tiếp trên
# Supabase (dự án không giữ file SQL / migration nào cho việc này); bước dọn
# dưới đây vẫn chạy đúng dù DB đã đổi sang CASCADE hay chưa.
TABLE_SAVED_EVENTS = "saved_events"
TABLE_WAITING_LIST = "waiting_list"
TABLE_CHECKIN_QR = "event_checkin_qr"
TABLE_NOTIFICATIONS = "notifications"

EVENT_CHILD_TABLES = (
    TABLE_REGISTRATIONS,
    TABLE_SAVED_EVENTS,
    TABLE_WAITING_LIST,
    TABLE_EVENT_REVISIONS,
)

# Trạng thái Organizer được phép mở form sửa.
# ONGOING không nằm ở đây: sự kiện đã bắt đầu thì mọi thay đổi (giờ, địa điểm,
# sức chứa...) đều gây rối cho người đang tham dự.
EDITABLE_STATUSES = {
    EventStatus.DRAFT.value,
    EventStatus.PENDING.value,
    EventStatus.PUBLISHED.value,
}

# Sự kiện đã công khai nhưng CHƯA bắt đầu: sửa xong PHẢI quay lại chờ Admin duyệt lại
REAPPROVAL_STATUSES = {EventStatus.PUBLISHED.value}

# Sự kiện đang diễn ra / đã đóng: khoá hoàn toàn, không sửa nội dung cũng không
# đổi trạng thái (kể cả huỷ) và không xoá được.
LOCKED_STATUSES = {
    EventStatus.ONGOING.value,
    EventStatus.ENDED.value,
    EventStatus.CANCELLED.value,
}

# Trạng thái mà Ban tổ chức được phép HUỶ sự kiện (khác với xoá hẳn).
# DRAFT không nằm ở đây: bản nháp chưa từng ra khỏi tài khoản Ban tổ chức, huỷ
# nó chỉ tạo thêm một bản ghi "Đã huỷ" vô nghĩa — xoá là đúng hơn.
CANCELLABLE_STATUSES = {
    EventStatus.PENDING.value,
    EventStatus.PUBLISHED.value,
}

# Các cột thuộc "nội dung sự kiện" — chỉ khi một trong số này đổi thì mới cần
# duyệt lại; đổi riêng event_status thì không tính. Danh sách nằm ở
# `event_revision_service.REVISION_FIELDS` để bảng `event_revisions` và luồng
# duyệt lại luôn hiểu "nội dung" là cùng một tập trường.
CONTENT_FIELDS = set(event_revision_service.REVISION_FIELDS)

logger = logging.getLogger(__name__)

# Cho phép sort theo whitelist để tránh SQL injection qua query param
SORT_FIELDS = {
    "newest": ("start_time", True),   # (cột, desc)
    "oldest": ("start_time", False),
    "title": ("title", False),
    "created": ("created_at", True),
}


# ─── Ánh xạ trạng thái: 6 giá trị của API ↔ 2 cột enum của DB ─────────────────
#
# Postgres CHỈ có hai enum sau, không thể ghi giá trị ngoài danh sách này:
#   event_status    : DRAFT | PUBLISHED | CANCELLED | COMPLETED
#   approval_status : PENDING | APPROVED | REJECTED   (cho phép NULL)
#
# Trong khi API và toàn bộ UI làm việc với MỘT trạng thái gộp 6 giá trị:
#   DRAFT | PENDING | PUBLISHED | ONGOING | ENDED | CANCELLED
#
# Vì vậy tầng service chịu trách nhiệm dịch hai chiều. Hợp đồng API không đổi —
# frontend vẫn nhận và gửi đúng 6 giá trị như trước.

DB_DRAFT = "DRAFT"
DB_PUBLISHED = "PUBLISHED"
DB_CANCELLED = "CANCELLED"
DB_COMPLETED = "COMPLETED"

# Sự kiện ĐÃ TỪNG công khai thì trang chi tiết vẫn phải mở được, kể cả khi đã
# huỷ hoặc đã đóng: sinh viên nhận thông báo huỷ luôn kèm link về sự kiện, và
# lịch sử tham gia cũng trỏ về đây. Điều kiện "đã từng công khai" nằm ở
# `approval_status = APPROVED` — DRAFT / PENDING không bao giờ lọt ra ngoài.
PUBLICLY_VISIBLE_EVENT_STATUSES = [DB_PUBLISHED, DB_CANCELLED, DB_COMPLETED]

# Nhãn enum `registration_status` trong DB (xem alembic a3b6e1576a9f)
DB_REGISTRATION_CANCELLED = "CANCELLED"

DB_APPROVAL_PENDING = "PENDING"
DB_APPROVAL_APPROVED = "APPROVED"
DB_APPROVAL_REJECTED = "REJECTED"

# Organizer chỉ được tự đặt 3 trạng thái này. PUBLISHED / ONGOING / ENDED là kết
# quả của việc Admin duyệt và của thời gian trôi qua, không phải thứ Organizer
# tự bấm — nếu không thì họ tự duyệt sự kiện của chính mình.
ORGANIZER_SETTABLE_STATUSES = {
    EventStatus.DRAFT.value,
    EventStatus.PENDING.value,
    EventStatus.CANCELLED.value,
}


def _now_naive_local() -> datetime:
    """Cột start_time / end_time là `timestamp` KHÔNG timezone.

    Form ghi xuống đúng giờ đồng hồ người dùng nhập (giờ VN), nên mốc "bây giờ"
    để so sánh cũng phải là giờ VN dạng naive — xem `app.core.app_time`.
    """
    return now_naive_local()


def _derive_ui_status(row: dict[str, Any]) -> str:
    """Suy ra trạng thái hiển thị (1 trong 6) từ 2 cột enum của DB + thời gian."""
    db_status = (row.get("event_status") or DB_DRAFT).upper()
    approval = (row.get("approval_status") or "").upper()

    if db_status == DB_CANCELLED:
        return EventStatus.CANCELLED.value
    if db_status == DB_COMPLETED:
        return EventStatus.ENDED.value

    if db_status == DB_PUBLISHED:
        # Đã được duyệt: ONGOING / ENDED phụ thuộc mốc thời gian, không lưu trong DB
        now = _now_naive_local()
        start = _naive(_parse_dt(row.get("start_time")))
        end = _naive(_parse_dt(row.get("end_time")))
        if end and now > end:
            return EventStatus.ENDED.value
        if start and start <= now:
            return EventStatus.ONGOING.value
        return EventStatus.PUBLISHED.value

    # Còn lại là DRAFT: đã gửi duyệt hay chưa nằm ở cột approval_status.
    # REJECTED bị trả về nháp để Organizer sửa rồi gửi lại.
    if approval == DB_APPROVAL_PENDING:
        return EventStatus.PENDING.value
    return EventStatus.DRAFT.value


def get_ui_status(row: dict[str, Any]) -> str:
    """Trạng thái hiển thị (1 trong 6) của một dòng `events`.

    Bọc công khai để service khác (`event_revision_service`) dùng chung đúng
    một cách suy trạng thái thay vì tự so cột `event_status` — xem
    `_derive_ui_status`.
    """
    return _derive_ui_status(row)


def _ui_status_to_db(ui_status: str) -> dict[str, Any]:
    """Dịch trạng thái API thành các cột DB tương ứng để ghi xuống."""
    mapping: dict[str, dict[str, Any]] = {
        # Nháp: chưa gửi duyệt nên xoá luôn dấu vết duyệt cũ
        EventStatus.DRAFT.value: {
            "event_status": DB_DRAFT,
            "approval_status": None,
        },
        # Gửi duyệt: sự kiện vẫn chưa công khai, chỉ khác ở approval_status
        EventStatus.PENDING.value: {
            "event_status": DB_DRAFT,
            "approval_status": DB_APPROVAL_PENDING,
        },
        EventStatus.PUBLISHED.value: {
            "event_status": DB_PUBLISHED,
            "approval_status": DB_APPROVAL_APPROVED,
        },
        # ONGOING không phải trạng thái lưu được — nó là PUBLISHED + đang trong giờ
        EventStatus.ONGOING.value: {
            "event_status": DB_PUBLISHED,
            "approval_status": DB_APPROVAL_APPROVED,
        },
        EventStatus.ENDED.value: {
            "event_status": DB_COMPLETED,
            "approval_status": DB_APPROVAL_APPROVED,
        },
        # Huỷ thì giữ nguyên approval_status để còn biết trước đó đã duyệt hay chưa
        EventStatus.CANCELLED.value: {"event_status": DB_CANCELLED},
    }
    return dict(mapping[ui_status])


def _apply_status_filter(query, ui_status: str):
    """Dịch bộ lọc trạng thái của UI thành điều kiện trên 2 cột DB."""
    now = _now_naive_local().isoformat()

    if ui_status == EventStatus.DRAFT.value:
        return query.eq("event_status", DB_DRAFT).or_(
            f"approval_status.is.null,approval_status.eq.{DB_APPROVAL_REJECTED}"
        )
    if ui_status == EventStatus.PENDING.value:
        return query.eq("event_status", DB_DRAFT).eq(
            "approval_status", DB_APPROVAL_PENDING
        )
    if ui_status == EventStatus.PUBLISHED.value:
        # Đã duyệt và chưa tới giờ bắt đầu → đang mở đăng ký
        return query.eq("event_status", DB_PUBLISHED).or_(
            f"start_time.gt.{now},start_time.is.null"
        )
    if ui_status == EventStatus.ONGOING.value:
        return (
            query.eq("event_status", DB_PUBLISHED)
            .lte("start_time", now)
            .gte("end_time", now)
        )
    if ui_status == EventStatus.ENDED.value:
        return query.or_(
            f"event_status.eq.{DB_COMPLETED},"
            f"and(event_status.eq.{DB_PUBLISHED},end_time.lt.{now})"
        )
    if ui_status == EventStatus.CANCELLED.value:
        return query.eq("event_status", DB_CANCELLED)
    return query


# ─── Đọc ──────────────────────────────────────────────────────────────────────


def list_events(
    *,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    organizer_id: Optional[str] = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 5,
) -> EventListOut:
    sb = get_supabase()
    query = sb.table(TABLE_EVENTS).select("*", count="exact")

    if search:
        query = query.ilike("title", f"%{search}%")
    if status_filter and status_filter.upper() != "ALL":
        query = _apply_status_filter(query, status_filter.upper())
    if organizer_id:
        query = query.eq("organizer_id", organizer_id)

    column, desc = SORT_FIELDS.get(sort, SORT_FIELDS["newest"])
    query = query.order(column, desc=desc)

    page = max(page, 1)
    page_size = max(min(page_size, 100), 1)
    start = (page - 1) * page_size
    query = query.range(start, start + page_size - 1)

    res = _run(query)
    rows: list[dict[str, Any]] = res.data or []
    total = res.count if res.count is not None else len(rows)

    categories = _category_map()
    ids = [_row_id(r) for r in rows]
    counts = _registration_counts(ids)
    # Một truy vấn cho cả trang thay vì hỏi từng dòng có bản sửa chờ duyệt không
    pending_ids = event_revision_service.events_with_pending_revision(ids)
    items = [
        _to_organizer_event_out(
            r,
            categories,
            counts,
            has_pending_revision=_row_id(r) in pending_ids,
        )
        for r in rows
    ]

    return EventListOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max((total + page_size - 1) // page_size, 1),
    )


def get_event(event_id: str, organizer_id: str) -> OrganizerEventOut:
    row = _get_raw(event_id, organizer_id)
    return _to_organizer_event_out(
        row,
        _category_map(),
        _registration_counts([_row_id(row)]),
        # Màn hình chi tiết / chỉnh sửa cần cả bảng so sánh cũ → mới
        revision=event_revision_service.get_pending_revision(event_id),
    )


def get_event_by_id(event_id: str) -> Optional[PublicEventOut]:
    """Trả về sự kiện đã được duyệt và đã từng công khai.

    Bao gồm cả sự kiện đã huỷ / đã đóng — người dùng cần mở được trang chi
    tiết từ thông báo huỷ và từ lịch sử tham gia. Việc CHẶN đăng ký vào sự
    kiện đã huỷ là trách nhiệm của router, không phải của hàm đọc này.
    """
    sb = get_supabase()
    query = (
        sb
        .table(TABLE_EVENTS)
        .select("*")
        .eq("event_id", event_id)
        .in_("event_status", PUBLICLY_VISIBLE_EVENT_STATUSES)
        .eq("approval_status", DB_APPROVAL_APPROVED)
        .limit(1)
    )
    rows: list[dict[str, Any]] = _run(query).data or []
    if not rows:
        return None

    row = rows[0]
    data = dict(row)
    data["category_name"] = _category_map().get(row.get("category_id"))
    data["organizer"] = _public_organizer_profile(sb, row.get("organizer_id"))
    return PublicEventOut(**data)


def _public_organizer_profile(sb: Any, organizer_id: Any) -> Optional[dict[str, Any]]:
    """Build the safe, public portion of an organizer profile."""
    if not organizer_id:
        return None

    user_query = (
        sb.table("users")
        .select(
            "user_id, full_name, avatar_url, department_name, "
            "organization_type_id, organization_description, "
            "contact_phone, office_address"
        )
        .eq("user_id", str(organizer_id))
        .limit(1)
    )
    users: list[dict[str, Any]] = _run(user_query).data or []
    if not users:
        return None

    user = users[0]
    organization_type = None
    organization_type_id = user.get("organization_type_id")
    if organization_type_id:
        type_query = (
            sb.table("organization_types")
            .select("name")
            .eq("organization_type_id", str(organization_type_id))
            .limit(1)
        )
        organization_types: list[dict[str, Any]] = _run(type_query).data or []
        if organization_types:
            organization_type = organization_types[0].get("name")

    return {
        "organizer_id": str(organizer_id),
        "name": user.get("full_name"),
        "avatar_url": profile_services.get_avatar_url(
            user.get("avatar_url"),
            supabase_client=sb,
        ),
        "department_name": user.get("department_name"),
        "organization_type": organization_type,
        "description": user.get("organization_description"),
        "contact_phone": user.get("contact_phone"),
        "office_address": user.get("office_address"),
    }


def list_ongoing_events() -> list[PublicEventOut]:
    """Return approved public events whose scheduled time includes now."""
    now = _now_naive_local().isoformat()
    query = (
        get_supabase()
        .table(TABLE_EVENTS)
        .select("*")
        .eq("event_status", DB_PUBLISHED)
        .eq("approval_status", DB_APPROVAL_APPROVED)
        .lte("start_time", now)
        .gte("end_time", now)
        .order("end_time", desc=False)
    )
    rows: list[dict[str, Any]] = _run(query).data or []
    categories = _category_map()

    events: list[PublicEventOut] = []
    for row in rows:
        data = dict(row)
        data["event_id"] = _row_id(row)
        data["category_name"] = categories.get(row.get("category_id"))
        data["event_status"] = EventStatus.ONGOING.value
        events.append(PublicEventOut(**data))
    return events


def get_stats(organizer_id: Optional[str] = None) -> StatsOut:
    sb = get_supabase()
    # Cần đủ 4 cột để suy ra trạng thái hiển thị (xem `_derive_ui_status`)
    query = sb.table(TABLE_EVENTS).select(
        "event_status, approval_status, start_time, end_time"
    )
    if organizer_id:
        query = query.eq("organizer_id", organizer_id)
    rows = _run(query).data or []

    stats = StatsOut(total=len(rows))
    bucket = {
        EventStatus.PUBLISHED.value: "published",
        EventStatus.DRAFT.value: "draft",
        EventStatus.PENDING.value: "pending",
        EventStatus.ONGOING.value: "ongoing",
        EventStatus.ENDED.value: "ended",
        EventStatus.CANCELLED.value: "cancelled",
    }
    for row in rows:
        key = bucket.get(_derive_ui_status(row))
        if key:
            setattr(stats, key, getattr(stats, key) + 1)
    return stats


def list_categories() -> list[CategoryOut]:
    res = _run(
        get_supabase()
        .table(TABLE_CATEGORIES)
        .select("category_id, name")
        .order("name")
    )
    return [CategoryOut(**row) for row in (res.data or [])]


def list_locations() -> list[str]:
    """Gợi ý địa điểm dựa trên các sự kiện đã có."""
    res = _run(
        get_supabase()
        .table(TABLE_EVENTS)
        .select("location")
        .not_.is_("location", "null")
        .limit(500)
    )
    seen: list[str] = []
    for row in res.data or []:
        loc = (row.get("location") or "").strip()
        if loc and loc not in seen:
            seen.append(loc)
    return sorted(seen)


# ─── Ghi ──────────────────────────────────────────────────────────────────────


def create_event(
    payload: EventCreate,
    organizer_id: str,
) -> OrganizerEventOut:
    data = payload.model_dump(exclude_none=True, mode="json")
    target_status = payload.event_status.value
    data.pop("event_status", None)
    data["organizer_id"] = organizer_id

    # Gửi duyệt (PENDING) thì phải đủ trường bắt buộc. Kiểm tra ở đây — trước
    # dòng `setdefault` bên dưới — để sự kiện chưa đặt tên không bị âm thầm
    # điền tên mặc định rồi lọt qua vòng gửi duyệt.
    if target_status == EventStatus.PENDING.value:
        missing = missing_required_fields(data)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Thiếu thông tin bắt buộc: " + ", ".join(missing),
            )

    # Chỉ bản nháp mới được phép để trống tên.
    data.setdefault("title", "Sự kiện chưa có tên")

    # Dịch trạng thái API → cột DB ngay trước khi ghi
    data.update(_ui_status_to_db(target_status))

    res = _run(get_supabase().table(TABLE_EVENTS).insert(data))
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tạo sự kiện thất bại.",
        )
    created_event = res.data[0]
    if target_status == EventStatus.PENDING.value:
        notification_service.notify_admins_event_pending(
            event_id=_row_id(created_event),
            event_title=created_event.get("title") or data["title"],
        )
    return _to_organizer_event_out(created_event, _category_map(), {})


def update_event(
    event_id: str,
    payload: EventUpdate,
    organizer_id: str,
    cancel_reason: Optional[str] = None,
) -> OrganizerEventOut:
    """`cancel_reason` chỉ dùng khi payload đưa sự kiện sang trạng thái Đã huỷ:
    nội dung này được ghép vào thông báo gửi cho sinh viên đã đăng ký."""
    current = _get_raw(event_id, organizer_id)
    current_status = _derive_ui_status(current)

    data = payload.model_dump(exclude_unset=True, mode="json")
    # `event_status` không phải cột ghi thẳng được nữa — giữ riêng, dịch ở cuối
    data.pop("event_status", None)
    target_status = (
        payload.event_status.value if payload.event_status is not None else None
    )
    # (Đổi địa điểm / thời gian của sự kiện ĐANG CÔNG KHAI không đi qua đây mà
    # qua `event_revisions`; thông báo cho sinh viên gửi lúc Admin duyệt bản sửa
    # — xem `event_revision_service._notify_revision_approved`.)
    is_newly_cancelled = (
        target_status == EventStatus.CANCELLED.value
        and current_status != EventStatus.CANCELLED.value
    )

    if not data and target_status is None:
        return _to_organizer_event_out(current, _category_map(), {})

    if target_status is not None and target_status not in ORGANIZER_SETTABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Ban tổ chức chỉ được đặt trạng thái Bản nháp, Chờ duyệt hoặc "
                "Đã huỷ. Việc công khai sự kiện do Quản trị viên quyết định."
            ),
        )

    # Đang diễn ra / đã kết thúc / đã huỷ thì khoá mọi thay đổi, kể cả đổi trạng thái
    if current_status in LOCKED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_locked_message(current_status),
        )

    # Những trường nội dung THỰC SỰ đổi (so sánh có chuẩn hoá ngày giờ và số,
    # tránh coi "2026-08-20T07:20:00" khác "2026-08-20T07:20:00+00:00")
    changed = event_revision_service.changed_fields(data, current)

    # Kiểm tra lại ràng buộc sau khi trộn dữ liệu cũ + mới. Với sự kiện đã công
    # khai, đúng bộ kiểm tra này còn được chạy LẠI lúc Admin duyệt bản sửa —
    # xem `validate_pending_changes`.
    merged = {**current, **data}
    validate_pending_changes(event_id, data, current)

    # ── Sự kiện ĐÃ ĐƯỢC DUYỆT: KHÔNG ghi đè bảng `events` ────────────────────
    # Dữ liệu mới đi vào bảng `event_revisions` kèm ảnh chụp giá trị cũ, chờ
    # Admin đối chiếu rồi mới áp dụng. Bản đang chạy giữ nguyên nên sinh viên
    # vẫn xem và đăng ký bình thường trong lúc chờ duyệt.
    # Ngoại lệ: yêu cầu HUỶ sự kiện đi thẳng xuống dưới, không phải chờ duyệt.
    is_cancelling = target_status == EventStatus.CANCELLED.value
    if current_status in REAPPROVAL_STATUSES and changed and not is_cancelling:
        missing = missing_required_fields(merged)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Thiếu thông tin bắt buộc: " + ", ".join(missing),
            )

        revision = event_revision_service.submit_revision(
            event_id=event_id,
            organizer_id=organizer_id,
            new_data=data,
            current=current,
        )
        return _to_organizer_event_out(
            current,
            _category_map(),
            _registration_counts([event_id]),
            revision=revision,
        )

    # Nếu kết quả cuối cùng là PENDING (gửi duyệt / duyệt lại) thì bản ghi SAU KHI
    # trộn phải đủ thông tin bắt buộc — kể cả tệp kế hoạch sự kiện.
    final_status = target_status or current_status
    if final_status == EventStatus.PENDING.value:
        missing = missing_required_fields(merged)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Thiếu thông tin bắt buộc: " + ", ".join(missing),
            )

    # Dịch trạng thái API → cột DB ngay trước khi ghi
    if target_status is not None:
        data.update(_ui_status_to_db(target_status))
        merged.update(_ui_status_to_db(target_status))

    query = (
        get_supabase()
        .table(TABLE_EVENTS)
        .update(data)
        .eq("event_id", event_id)
        .eq("organizer_id", organizer_id)
    )
    res = _run(query)
    row = res.data[0] if res.data else merged

    # Sức chứa vừa nới rộng thì ghế mới phải được lấp ngay bằng người đang xếp
    # hàng chờ — để trống trong khi danh sách chờ còn người là vô nghĩa.
    _promote_waitlist_if_capacity_raised(event_id, current, row, merged)

    if (
        final_status == EventStatus.PENDING.value
        and current_status != EventStatus.PENDING.value
    ):
        notification_service.notify_admins_event_pending(
            event_id=event_id,
            event_title=row.get("title") or merged.get("title") or "Sự kiện",
        )

    # Sự kiện đã huỷ thì bản sửa đang chờ duyệt không còn ý nghĩa
    if is_cancelling:
        event_revision_service.cancel_pending_revision(event_id)

    # Báo cho sinh viên đã đăng ký NGAY khi sự kiện chuyển sang Đã huỷ
    if is_newly_cancelled:
        _notify_event_cancelled(current, cancel_reason)

    return _to_organizer_event_out(
        row,
        _category_map(),
        _registration_counts([event_id]),
        # Lưu bản nháp / gửi duyệt mà sự kiện vẫn còn bản sửa chờ duyệt thì phản
        # hồi phải nói rõ điều đó, tránh giao diện tưởng đã áp dụng xong.
        revision=(
            None
            if is_cancelling
            else event_revision_service.get_pending_revision(event_id)
        ),
    )


def cancel_event(
    event_id: str,
    organizer_id: str,
    reason: Optional[str] = None,
) -> OrganizerEventOut:
    """Huỷ sự kiện: giữ lại bản ghi ở trạng thái Đã huỷ thay vì xoá.

    Khác `delete_event` ở chỗ toàn bộ dữ liệu đăng ký / điểm danh vẫn còn, và
    sinh viên đã đăng ký nhận được thông báo kèm lý do huỷ.
    """
    current = _get_raw(event_id, organizer_id)
    current_status = _derive_ui_status(current)

    if current_status not in CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_cancel_blocked_message(current_status),
        )

    cleaned_reason = (reason or "").strip()
    # Chỉ sự kiện đã công khai mới bắt buộc lý do — đó là lúc có sinh viên đã
    # đăng ký và họ cần biết vì sao sự kiện không diễn ra nữa.
    if current_status == EventStatus.PUBLISHED.value and not cleaned_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Vui lòng nhập lý do huỷ để gửi kèm thông báo cho sinh viên "
                "đã đăng ký."
            ),
        )

    return update_event(
        event_id,
        EventUpdate(event_status=EventStatus.CANCELLED),
        organizer_id,
        cancel_reason=cleaned_reason or None,
    )


def delete_event(event_id: str, organizer_id: str) -> None:
    current = _get_raw(event_id, organizer_id)

    # Sự kiện đang diễn ra thì không được xoá — xoá là mất luôn dữ liệu đăng ký
    # và điểm danh của người đang tham dự.
    if _derive_ui_status(current) == EventStatus.ONGOING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sự kiện đang diễn ra nên không thể xoá.",
        )

    _purge_event_children(event_id)

    _run(
        get_supabase()
        .table(TABLE_EVENTS)
        .delete()
        .eq("event_id", event_id)
        .eq("organizer_id", organizer_id)
    )


def _purge_event_children(event_id: str) -> None:
    """Dọn dữ liệu tham chiếu tới sự kiện trước khi xoá bản ghi `events`.

    Không có bước này, Postgres chặn lệnh xoá với lỗi
    `violates foreign key constraint ...` — hay gặp nhất với sự kiện đã huỷ,
    vì lúc huỷ hệ thống vừa ghi một loạt thông báo trỏ về nó.

    Thông báo thì KHÔNG xoá: sinh viên vẫn cần đọc lại tin "sự kiện đã huỷ"
    trong hộp thư. Chỉ gỡ liên kết `event_id` (cột cho phép NULL) — giao diện
    tự ẩn nút "Xem sự kiện" khi thiếu trường này.
    """
    supabase = get_supabase()

    # QR điểm danh treo trên registration chứ không trên event, phải xoá trước
    # khi xoá event_registrations.
    registration_ids = [
        row["registration_id"]
        for row in (
            _run(
                supabase.table(TABLE_REGISTRATIONS)
                .select("registration_id")
                .eq("event_id", event_id)
            ).data
            or []
        )
        if row.get("registration_id")
    ]
    for chunk in _chunked(registration_ids, 100):
        _run_optional(
            supabase.table(TABLE_CHECKIN_QR).delete().in_("registration_id", chunk)
        )

    for table in EVENT_CHILD_TABLES:
        _run_optional(supabase.table(table).delete().eq("event_id", event_id))

    _run_optional(
        supabase.table(TABLE_NOTIFICATIONS)
        .update({"event_id": None})
        .eq("event_id", event_id)
    )


def _chunked(items: list[Any], size: int) -> list[list[Any]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def cancel_pending_revision(
    event_id: str,
    organizer_id: str,
) -> OrganizerEventOut:
    """Ban tổ chức rút lại yêu cầu chỉnh sửa đang chờ Admin duyệt.

    Bảng `events` không đổi — bản đang công khai vốn chưa hề bị ghi đè.
    """
    current = _get_raw(event_id, organizer_id)
    if not event_revision_service.cancel_pending_revision(event_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sự kiện này không có yêu cầu chỉnh sửa nào đang chờ duyệt.",
        )
    return _to_organizer_event_out(
        current, _category_map(), _registration_counts([event_id])
    )


def change_status(
    event_id: str,
    new_status: EventStatus,
    organizer_id: str,
) -> OrganizerEventOut:
    return update_event(
        event_id,
        EventUpdate(event_status=new_status),
        organizer_id,
    )


# ─── Internal helpers ─────────────────────────────────────────────────────────


def _run(query):
    """Thực thi query Supabase và chuyển lỗi thành HTTPException dễ đọc."""
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


def _run_optional(query):
    """Như `_run` nhưng bỏ qua khi bảng chưa tồn tại trong DB.

    Một vài bảng phụ (`waiting_list`, `event_revisions`...) được tạo tay trên
    Supabase nên có thể vắng mặt ở môi trường dev — thiếu bảng thì cũng không
    có dữ liệu nào chặn việc xoá.
    """
    try:
        return _run(query)
    except HTTPException as exc:
        detail = str(exc.detail)
        if "does not exist" in detail or "schema cache" in detail:
            logger.warning("Bỏ qua bảng chưa có khi dọn dữ liệu sự kiện: %s", detail)
            return None
        raise


def _find_raw(
    event_id: str,
    organizer_id: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    query = (
        get_supabase()
        .table(TABLE_EVENTS)
        .select("*")
        .eq("event_id", event_id)
    )
    if organizer_id is not None:
        query = query.eq("organizer_id", organizer_id)
    res = _run(query.limit(1))
    return res.data[0] if res.data else None


def _get_raw(event_id: str, organizer_id: str) -> dict[str, Any]:
    row = _find_raw(event_id, organizer_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sự kiện."
        )
    return row


def _row_id(row: dict[str, Any]) -> str:
    return str(row.get("event_id") or row.get("id") or "")


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


def _registration_counts(event_ids: list[str]) -> dict[str, int]:
    """Đếm số người đã đăng ký cho từng sự kiện.

    Đăng ký đã huỷ KHÔNG được tính — nếu tính thì một sinh viên huỷ chỗ vẫn
    chiếm sức chứa, đúng bằng cách `registration_service.get_registration_count`
    đếm cho phía sinh viên. Hai bên phải ra cùng một con số.

    Lỗi truy vấn thì trả về rỗng để trang vẫn tải được, nhưng có ghi log —
    nuốt lỗi im lặng chính là thứ từng khiến ô "0/300" trông như đúng.
    """
    ids = [i for i in event_ids if i]
    if not ids:
        return {}
    try:
        res = (
            get_supabase()
            .table(TABLE_REGISTRATIONS)
            .select("event_id, registration_status")
            .in_("event_id", ids)
            .neq("registration_status", "CANCELLED")
            .neq("registration_status", "WAITLISTED")
            .execute()
        )
    except Exception:  # noqa: BLE001
        logger.warning(
            "Không đếm được số người đăng ký (bảng %s)",
            TABLE_REGISTRATIONS,
            exc_info=True,
        )
        return {}
    counts: dict[str, int] = {}
    for row in res.data or []:
        reg_status = str(row.get("registration_status") or "").upper()
        if reg_status in (DB_REGISTRATION_CANCELLED, "WAITLISTED", "WAITLIST"):
            continue
        key = str(row.get("event_id"))
        counts[key] = counts.get(key, 0) + 1
    return counts


def _parse_dt(value: Any) -> Optional[datetime]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _validate_merged_dates(merged: dict[str, Any]) -> None:
    start = _parse_dt(merged.get("start_time"))
    end = _parse_dt(merged.get("end_time"))
    deadline = _parse_dt(merged.get("registration_deadline"))
    if start and end and end <= start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Thời gian kết thúc phải sau thời gian bắt đầu.",
        )
    if start and deadline and deadline > start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Hạn chót đăng ký phải trước thời điểm sự kiện bắt đầu.",
        )


def _cancel_blocked_message(current_status: str) -> str:
    """Câu thông báo khi trạng thái hiện tại không cho phép huỷ."""
    if current_status == EventStatus.DRAFT.value:
        return (
            "Bản nháp chưa từng công khai nên không cần huỷ — hãy xoá sự kiện "
            "nếu không dùng nữa."
        )
    if current_status == EventStatus.CANCELLED.value:
        return "Sự kiện này đã bị huỷ trước đó."
    if current_status == EventStatus.ONGOING.value:
        return "Sự kiện đang diễn ra nên không thể huỷ."
    return "Sự kiện đã kết thúc nên không thể huỷ."


def _notify_event_cancelled(
    current: dict[str, Any], reason: Optional[str]
) -> None:
    """Gửi thông báo huỷ (kèm lý do) cho toàn bộ sinh viên đã đăng ký.

    Sự kiện chưa được duyệt công khai thì chưa có ai đăng ký được, nên bỏ qua
    luôn thay vì tốn thêm một truy vấn danh sách đăng ký.
    """
    if _derive_ui_status(current) != EventStatus.PUBLISHED.value:
        return

    event_title = current.get("title") or "Sự kiện"
    content = f'Sự kiện "{event_title}" đã bị huỷ.'
    if reason:
        content += f" Lý do: {reason}"

    notification_service.notify_event_participants(
        event_id=_row_id(current),
        notification_type=NotificationType.EVENT_CANCELLED,
        title=f"Sự kiện đã bị huỷ: {event_title}",
        content=content,
    )


def _locked_message(current_status: str) -> str:
    """Câu thông báo tương ứng với lý do sự kiện bị khoá."""
    if current_status == EventStatus.ONGOING.value:
        return "Sự kiện đang diễn ra nên không thể chỉnh sửa hay đổi trạng thái."
    return "Sự kiện đã kết thúc hoặc đã huỷ nên không thể chỉnh sửa."


def _validate_changed_dates_not_past(
    data: dict[str, Any], current: dict[str, Any]
) -> None:
    """Chặn Organizer ĐỔI thời gian bắt đầu / hạn đăng ký sang mốc đã trôi qua.

    Chỉ xét những trường thực sự thay đổi: sự kiện đang diễn ra vốn có start_time
    nằm trong quá khứ, nếu kiểm tra cả trường không đổi thì mọi thao tác sửa nội
    dung khác đều bị chặn oan.

    Lưu ý múi giờ: DB lưu `timestamp` không timezone, giá trị là giờ đồng hồ VN
    đúng như form gửi lên, nên so sánh với `_now_naive_local()` (cũng giờ VN).
    """
    now = _now_naive_local()
    labels = {
        "start_time": "Thời gian bắt đầu sự kiện",
        "registration_deadline": "Hạn chót đăng ký",
    }

    for field, label in labels.items():
        if field not in data:
            continue
        new_value = _naive(_parse_dt(data.get(field)))
        old_value = _naive(_parse_dt(current.get(field)))
        if new_value is None:
            continue
        # Sai lệch dưới 1 giây coi như không đổi — tránh chặn oan khi client gửi
        # lại đúng mốc cũ nhưng chuỗi ISO chênh nhau phần mili giây.
        if old_value is not None and abs(new_value - old_value) < timedelta(seconds=1):
            continue
        if new_value <= now:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{label} không được ở trong quá khứ.",
            )


def _validate_capacity_against_registrations(
    event_id: str, capacity: Any
) -> None:
    """Không cho hạ sức chứa xuống thấp hơn số người đã đăng ký."""
    if capacity in (None, ""):
        return
    registered = _registration_counts([event_id]).get(event_id, 0)
    if int(capacity) < registered:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Sức chứa mới ({capacity}) nhỏ hơn số người đã đăng ký ({registered})."
            ),
        )


def validate_pending_changes(
    event_id: str,
    changes: dict[str, Any],
    current: dict[str, Any],
) -> None:
    """Kiểm tra một tập thay đổi có áp dụng được lên sự kiện `current` không.

    Hàm này được gọi ở HAI thời điểm, và đó là toàn bộ lý do nó tồn tại:

    1. Lúc Ban tổ chức GỬI thay đổi (`update_event`) — để báo lỗi ngay trên form.
    2. Lúc Admin DUYỆT bản sửa (`event_revision_service.approve_revision`) — vì
       với sự kiện đã công khai, dữ liệu chỉ thực sự được ghi vào bảng `events`
       ở bước này, có thể là nhiều ngày sau bước (1).

    Thiếu lần gọi thứ hai thì sinh ra lỗi TOCTOU (kiểm tra một đằng, ghi một
    nẻo): Ban tổ chức hạ sức chứa xuống 1 lúc mới có 1 người đăng ký — hợp lệ;
    trong lúc chờ duyệt có thêm người đăng ký (bảng `events` vẫn giữ sức chứa CŨ
    nên không chặn); tới lúc Admin duyệt thì sự kiện có sức chứa 1 mà 2 người đã
    đăng ký. Ràng buộc phải được kiểm tra ở điểm GHI, không chỉ ở điểm nhận
    yêu cầu.
    """
    merged = {**current, **changes}
    # Mốc thời gian phải hợp lệ trên dữ liệu ĐÃ TRỘN: đổi mỗi `start_time` vẫn
    # phải so được với `end_time` cũ đang nằm trong DB.
    _validate_merged_dates(merged)
    _validate_changed_dates_not_past(changes, current)
    # Sức chứa thì chỉ xét khi chính nó thay đổi — một sự kiện lỡ quá tải sẵn
    # không được phép chặn luôn việc sửa mô tả hay địa điểm.
    if "capacity" in changes:
        _validate_capacity_against_registrations(event_id, changes["capacity"])


def _int_or_none(value: Any) -> Optional[int]:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _promote_waitlist_if_capacity_raised(
    event_id: str,
    before: dict[str, Any],
    after: dict[str, Any],
    merged: dict[str, Any],
) -> None:
    """Sức chứa tăng → đôn danh sách chờ lên cho đầy chỗ mới.

    Chỉ TĂNG mới đôn: hạ sức chứa đã bị `_validate_capacity_against_registrations`
    chặn từ trước, còn giữ nguyên thì không có ghế nào mở thêm. Bỏ giới hạn
    (số → None) cũng tính là tăng.

    Lỗi ở đây không được làm hỏng việc lưu sự kiện — sự kiện đã ghi xong rồi.
    """
    old_capacity = _int_or_none(before.get("capacity"))
    new_capacity = _int_or_none(after.get("capacity", merged.get("capacity")))
    if old_capacity is None:
        return
    if new_capacity is not None and new_capacity <= old_capacity:
        return

    try:
        registration_service.promote_waitlisted(
            event_id,
            new_capacity,
            event_title=after.get("title") or merged.get("title"),
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Không đôn được danh sách chờ sau khi tăng sức chứa sự kiện %s.",
            event_id,
        )


def _naive(dt: Optional[datetime]) -> Optional[datetime]:
    """Bỏ timezone để so sánh cùng hệ quy chiếu với `_now_naive_local`.

    Giá trị lấy từ DB là giờ đồng hồ (giờ VN) và không có timezone; nếu tầng
    client có kèm offset thì quy về múi giờ ứng dụng trước khi bỏ, để không làm
    xê dịch giờ mà người dùng đã nhập.
    """
    if dt and dt.tzinfo is not None:
        return dt.astimezone(APP_TZ).replace(tzinfo=None)
    return dt


def _to_organizer_event_out(
    row: dict[str, Any],
    categories: dict[int, str],
    counts: dict[str, int],
    *,
    revision: Optional[dict[str, Any]] = None,
    has_pending_revision: Optional[bool] = None,
) -> OrganizerEventOut:
    event_id = _row_id(row)
    capacity = row.get("capacity")
    registered = counts.get(event_id, 0)
    # Trạng thái trả ra API là giá trị gộp 6 mức, suy từ 2 cột enum của DB
    event_status = _derive_ui_status(row)

    # Hạn đăng ký cũng là giờ VN dạng naive → so với `now` cùng hệ quy chiếu
    deadline = _naive(_parse_dt(row.get("registration_deadline")))
    now = _now_naive_local()
    is_full = capacity is not None and registered >= int(capacity)
    is_open = (
        event_status == EventStatus.PUBLISHED.value
        and (deadline is None or deadline >= now)
        and not is_full
    )

    pending_revision: Optional[EventRevisionOut] = None
    if revision is not None:
        # `row` chính là dòng `events` đang giữ nội dung CŨ — nguồn để dựng bảng
        # so sánh "cũ → mới" mà không cần lưu thêm ảnh chụp nào trong DB.
        pending_revision = event_revision_service.to_out(
            revision, categories, current_event=row
        )
    if has_pending_revision is None:
        has_pending_revision = pending_revision is not None

    return OrganizerEventOut(
        event_id=event_id or None,
        title=row.get("title"),
        category_id=row.get("category_id"),
        category_name=categories.get(row.get("category_id")),
        location=row.get("location"),
        start_time=_parse_dt(row.get("start_time")),
        end_time=_parse_dt(row.get("end_time")),
        registration_deadline=_parse_dt(row.get("registration_deadline")),
        capacity=capacity,
        registered_count=registered,
        seats_left=None if capacity is None else max(int(capacity) - registered, 0),
        is_full=is_full,
        is_registration_open=is_open,
        description=row.get("description"),
        banner_url=row.get("banner_url"),
        file_url=row.get("file_url"),
        event_status=event_status,
        can_edit=event_status in EDITABLE_STATUSES,
        # Sự kiện đang diễn ra thì ẩn luôn nút xoá ở phía giao diện
        can_delete=event_status != EventStatus.ONGOING.value,
        # Sửa sự kiện đang công khai thì phải chờ Admin duyệt lại → UI cảnh báo trước
        requires_reapproval=event_status in REAPPROVAL_STATUSES,
        # Đang có yêu cầu chỉnh sửa nằm chờ Admin duyệt (bảng `event_revisions`)
        has_pending_revision=bool(has_pending_revision),
        pending_revision=pending_revision,
        created_at=_parse_dt(row.get("created_at")),
    )
