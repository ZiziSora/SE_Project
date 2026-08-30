from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.database import supabase


def _now_naive_utc() -> datetime:
    """Cột thời gian trong DB là `timestamp` không timezone và được coi là giờ UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_dt(value: Any) -> Optional[datetime]:
    """Đưa chuỗi ISO (có hoặc không kèm offset) về datetime naive theo giờ UTC."""
    if value in (None, ""):
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def get_filtered_events_service(
    search_term: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = 'Sắp diễn ra',
    page: int = 1,
    limit: int = 10
) -> Dict[str, Any]:

    # Explore is public: only events approved by an Admin and published by the
    # platform may continue through the search/filter/pagination pipeline.
    builder = (
        supabase.table('events')
        .select('*')
        .eq('event_status', 'PUBLISHED')
        .eq('approval_status', 'APPROVED')
    )

    # Step 2: search by title using ILIKE
    if search_term:
        builder = builder.ilike('title', f"%{search_term}%")

    # Step 3: category filter
    if category and category != 'Tất cả':
        category_map = {
            'Học thuật': 1,
            'Kỹ năng mềm': 2,
            'Việc làm': 3,
            'Văn hóa - Nghệ thuật': 4,
            'Tình nguyện': 5,
            'Khởi nghiệp': 6
        }
        cat_id = category_map.get(category)
        if cat_id is not None:
            builder = builder.eq('category_id', cat_id)

    resp = builder.execute()
    events = resp.data if hasattr(resp, 'data') else (resp.get('data', []) if isinstance(resp, dict) else [])

    if not events:
        return {
            "total_items": 0,
            "current_page": page,
            "page_size": limit,
            "total_pages": 0,
            "events": []
        }

    # Step 4: get registration counts
    event_ids = [e.get('event_id') for e in events if e.get('event_id')]
    registered_counts: Dict[str, int] = {}

    if event_ids:
        regs_resp = supabase.table('event_registrations').select('event_id, registration_status').in_('event_id', event_ids).execute()
        regs = regs_resp.data if hasattr(regs_resp, 'data') else (regs_resp.get('data', []) if isinstance(regs_resp, dict) else [])
        for r in (regs or []):
            eid = r.get('event_id')
            # Đăng ký đã huỷ hoặc ở danh sách chờ không chiếm chỗ chính thức
            reg_st = str(r.get('registration_status') or '').upper()
            if reg_st in ('CANCELLED', 'WAITLISTED', 'WAITLIST'):
                continue
            if eid:
                registered_counts[eid] = registered_counts.get(eid, 0) + 1

    for e in events:
        e['registered_count'] = registered_counts.get(e.get('event_id'), 0)

    # Step 5: "Sắp diễn ra" — giữ lại sự kiện chưa kết thúc VÀ vẫn còn đăng ký
    # được. Sự kiện đang diễn ra vẫn hiện nếu chưa quá hạn đăng ký; sự kiện đã
    # kết thúc hoặc đã hết hạn đăng ký thì ẩn đi.
    if sort_by == 'Sắp diễn ra':
        now = _now_naive_utc()
        upcoming = []
        for e in events:
            end = _parse_dt(e.get('end_time'))
            if end is not None and end < now:
                continue  # đã kết thúc
            deadline = _parse_dt(e.get('registration_deadline'))
            if deadline is not None and deadline < now:
                continue  # hết hạn đăng ký
            upcoming.append(e)
        events = upcoming

    # Step 6: sorting
    if sort_by == 'Sắp diễn ra':
        # Gần nhất lên đầu; sự kiện thiếu giờ bắt đầu xếp cuối
        events.sort(key=lambda x: _parse_dt(x.get('start_time')) or datetime.max)
    elif sort_by == 'Nổi nhất':
        # Nhiều người đăng ký nhất lên đầu
        events.sort(key=lambda x: x.get('registered_count', 0), reverse=True)
    else:
        # Dự phòng: theo thời điểm tạo, mới nhất trước
        events.sort(key=lambda x: x.get('created_at') or '', reverse=True)

    # Step 7: Pagination
    total_events = len(events)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_events = events[start_idx:end_idx]

    return {
        "total_items": total_events,
        "current_page": page,
        "page_size": limit,
        "total_pages": (total_events + limit - 1) // limit if limit > 0 else 0,
        "events": paginated_events
    }
