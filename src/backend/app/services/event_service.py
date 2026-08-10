"""Toàn bộ nghiệp vụ sự kiện: CRUD, thống kê, đếm người đăng ký, danh mục.

Đây là tầng duy nhất gọi Supabase. Router chỉ nhận request → gọi service → trả JSON.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.core.config import TABLE_CATEGORIES, TABLE_EVENTS, TABLE_REGISTRATIONS
from app.core.supabase_client import get_supabase
from app.schemas.category import CategoryOut
from app.schemas.event import EventOut as PublicEventOut
from app.schemas.organizer_event import (
    EventCreate,
    EventListOut,
    EventStatus,
    EventUpdate,
    OrganizerEventOut,
    StatsOut,
    missing_required_fields,
)

# Trạng thái Organizer được phép mở form sửa
EDITABLE_STATUSES = {
    EventStatus.DRAFT.value,
    EventStatus.PENDING.value,
    EventStatus.PUBLISHED.value,
    EventStatus.ONGOING.value,
}

# Sự kiện đã công khai: sửa xong PHẢI quay lại chờ Admin duyệt lại
REAPPROVAL_STATUSES = {EventStatus.PUBLISHED.value, EventStatus.ONGOING.value}

# Sự kiện đã đóng: không còn gì để duyệt lại nên khoá luôn
LOCKED_STATUSES = {EventStatus.ENDED.value, EventStatus.CANCELLED.value}

# Các cột thuộc "nội dung sự kiện". Chỉ khi một trong số này thay đổi thì mới
# cần duyệt lại — đổi riêng event_status thì không tính.
CONTENT_FIELDS = {
    "title",
    "category_id",
    "location",
    "start_time",
    "end_time",
    "registration_deadline",
    "capacity",
    "description",
    "banner_url",
    "file_url",
}

# Cho phép sort theo whitelist để tránh SQL injection qua query param
SORT_FIELDS = {
    "newest": ("start_time", True),   # (cột, desc)
    "oldest": ("start_time", False),
    "title": ("title", False),
    "created": ("created_at", True),
}


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
        query = query.eq("event_status", status_filter.upper())
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
    counts = _registration_counts([_row_id(r) for r in rows])
    items = [_to_organizer_event_out(r, categories, counts) for r in rows]

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
        row, _category_map(), _registration_counts([_row_id(row)])
    )


def get_event_by_id(event_id: str) -> Optional[PublicEventOut]:
    """Return the public event representation using the shared event lookup."""
    row = _find_raw(event_id)
    if row is None:
        return None

    data = dict(row)
    data["category_name"] = _category_map().get(row.get("category_id"))
    return PublicEventOut(**data)


def get_stats(organizer_id: Optional[str] = None) -> StatsOut:
    sb = get_supabase()
    query = sb.table(TABLE_EVENTS).select("event_status")
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
        key = bucket.get((row.get("event_status") or "").upper())
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
    data["event_status"] = payload.event_status.value
    data["organizer_id"] = organizer_id
    data.setdefault("title", "Sự kiện chưa có tên")

    res = _run(get_supabase().table(TABLE_EVENTS).insert(data))
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tạo sự kiện thất bại.",
        )
    return _to_organizer_event_out(res.data[0], _category_map(), {})


def update_event(
    event_id: str,
    payload: EventUpdate,
    organizer_id: str,
) -> OrganizerEventOut:
    current = _get_raw(event_id, organizer_id)
    current_status = (current.get("event_status") or EventStatus.DRAFT.value).upper()

    data = payload.model_dump(exclude_unset=True, mode="json")
    if payload.event_status is not None:
        data["event_status"] = payload.event_status.value

    if not data:
        return _to_organizer_event_out(current, _category_map(), {})

    # Sự kiện đã kết thúc / đã huỷ thì không cho sửa nữa
    if current_status in LOCKED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Sự kiện đã kết thúc hoặc đã huỷ nên không thể chỉnh sửa."
            ),
        )

    # Sự kiện đang công khai: mọi thay đổi nội dung đều phải chờ Admin duyệt lại,
    # nên tự đưa trạng thái về PENDING (kể cả khi client không gửi event_status).
    content_changed = any(
        field in data and data[field] != current.get(field) for field in CONTENT_FIELDS
    )
    if current_status in REAPPROVAL_STATUSES and content_changed:
        data["event_status"] = EventStatus.PENDING.value

    # Kiểm tra lại ràng buộc ngày tháng sau khi trộn dữ liệu cũ + mới
    merged = {**current, **data}
    _validate_merged_dates(merged)
    _validate_capacity_against_registrations(event_id, merged.get("capacity"))

    # Nếu kết quả cuối cùng là PENDING (gửi duyệt / duyệt lại) thì bản ghi SAU KHI
    # trộn phải đủ thông tin bắt buộc — kể cả tệp kế hoạch sự kiện.
    if merged.get("event_status") == EventStatus.PENDING.value:
        missing = missing_required_fields(merged)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Thiếu thông tin bắt buộc: " + ", ".join(missing),
            )

    query = (
        get_supabase()
        .table(TABLE_EVENTS)
        .update(data)
        .eq("event_id", event_id)
        .eq("organizer_id", organizer_id)
    )
    res = _run(query)
    row = res.data[0] if res.data else merged
    return _to_organizer_event_out(
        row, _category_map(), _registration_counts([event_id])
    )


def delete_event(event_id: str, organizer_id: str) -> None:
    _get_raw(event_id, organizer_id)
    _run(
        get_supabase()
        .table(TABLE_EVENTS)
        .delete()
        .eq("event_id", event_id)
        .eq("organizer_id", organizer_id)
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

    Bảng registrations có thể chưa tồn tại ở giai đoạn này → trả về rỗng.
    """
    ids = [i for i in event_ids if i]
    if not ids:
        return {}
    try:
        res = (
            get_supabase()
            .table(TABLE_REGISTRATIONS)
            .select("event_id")
            .in_("event_id", ids)
            .execute()
        )
    except Exception:  # noqa: BLE001
        return {}
    counts: dict[str, int] = {}
    for row in res.data or []:
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


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _to_organizer_event_out(
    row: dict[str, Any],
    categories: dict[int, str],
    counts: dict[str, int],
) -> OrganizerEventOut:
    event_id = _row_id(row)
    capacity = row.get("capacity")
    registered = counts.get(event_id, 0)
    event_status = (row.get("event_status") or EventStatus.DRAFT.value).upper()

    deadline = _aware(_parse_dt(row.get("registration_deadline")))
    now = datetime.now(timezone.utc)
    is_full = capacity is not None and registered >= int(capacity)
    is_open = (
        event_status == EventStatus.PUBLISHED.value
        and (deadline is None or deadline >= now)
        and not is_full
    )

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
        # Sửa sự kiện đang công khai thì phải chờ Admin duyệt lại → UI cảnh báo trước
        requires_reapproval=event_status in REAPPROVAL_STATUSES,
        created_at=_parse_dt(row.get("created_at")),
    )
