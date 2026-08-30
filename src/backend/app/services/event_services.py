from datetime import datetime
from typing import Optional, Dict, Any

from app.core.app_time import now_naive_local
from app.database import supabase


def _rows(resp) -> list:
    """Supabase client trả về object có .data; giữ nhánh dict cho bản mock/test."""
    if hasattr(resp, "data"):
        return resp.data or []
    if isinstance(resp, dict):
        return resp.get("data", []) or []
    return []


def _parse_db_datetime(value: Any) -> Optional[datetime]:
    """Ép giá trị timestamp của Supabase về datetime naive (giờ VN theo quy ước)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        text = str(value).strip().replace(" ", "T")
        if text.endswith("Z"):
            text = text[:-1]
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError:
            return None
    return parsed.replace(tzinfo=None)


def _registration_open(event: Dict[str, Any], now: datetime) -> bool:
    deadline = _parse_db_datetime(event.get("registration_deadline"))
    return deadline is None or deadline >= now


def _empty_page(page: int, limit: int) -> Dict[str, Any]:
    return {
        "total_items": 0,
        "current_page": page,
        "page_size": limit,
        "total_pages": 0,
        "events": [],
    }


def get_filtered_events_service(
    search_term: Optional[str] = None,
    faculty: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = 'Mới nhất',
    page: int = 1,
    limit: int = 10
) -> Dict[str, Any]:

    # Trang Khám phá là nơi sinh viên ĐĂNG KÝ, nên chỉ hiển thị sự kiện còn đăng
    # ký được: đã được Admin duyệt + đang công khai + chưa bắt đầu + chưa quá hạn
    # đăng ký. Sự kiện đã kết thúc / đang diễn ra không còn ý nghĩa ở đây.
    #
    # Cột thời gian trong DB là `timestamp` KHÔNG timezone và lưu giờ Việt Nam,
    # nên mốc "bây giờ" phải lấy từ app_time.now_naive_local() (xem app/core/app_time.py).
    now = now_naive_local()
    now_iso = now.isoformat()

    builder = (
        supabase.table('events')
        .select('*')
        .eq('event_status', 'PUBLISHED')
        .eq('approval_status', 'APPROVED')
        .gt('start_time', now_iso)
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

    events = _rows(builder.execute())

    if not events:
        return _empty_page(page, limit)

    # Step 3b: hạn đăng ký đã trôi qua thì sự kiện coi như đóng đăng ký.
    # Lọc ở Python vì cột có thể NULL (nghĩa là không đặt hạn -> vẫn mở).
    events = [e for e in events if _registration_open(e, now)]

    if not events:
        return _empty_page(page, limit)

    # Step 4: faculty filter + tên đơn vị tổ chức hiển thị trên thẻ sự kiện
    organizer_ids = list({e.get('organizer_id') for e in events if e.get('organizer_id')})
    id_to_dept: Dict[str, Optional[str]] = {}
    id_to_name: Dict[str, Optional[str]] = {}

    if organizer_ids:
        users = _rows(
            supabase.table('users')
            .select('user_id, full_name, department_name')
            .in_('user_id', organizer_ids)
            .execute()
        )
        for u in users:
            id_to_dept[u['user_id']] = u.get('department_name')
            id_to_name[u['user_id']] = u.get('full_name')

    if faculty and faculty != 'Tất cả' and organizer_ids:
        normalized_faculty = faculty.strip().lower()
        events = [
            e for e in events
            if (id_to_dept.get(e.get('organizer_id')) or '').strip().lower()
            == normalized_faculty
        ]

    if not events:
        return _empty_page(page, limit)

    # Step 4b: tên danh mục để thẻ sự kiện hiển thị tag (Học thuật, Việc làm...)
    category_ids = list({e.get('category_id') for e in events if e.get('category_id')})
    id_to_category: Dict[Any, Optional[str]] = {}
    if category_ids:
        categories = _rows(
            supabase.table('event_categories')
            .select('category_id, name')
            .in_('category_id', category_ids)
            .execute()
        )
        id_to_category = {c['category_id']: c.get('name') for c in categories}

    # Step 5: get registration counts
    event_ids = [e.get('event_id') for e in events if e.get('event_id')]
    registered_counts: Dict[str, int] = {}

    if event_ids:
        regs = _rows(
            supabase.table('event_registrations')
            .select('event_id, registration_status')
            .in_('event_id', event_ids)
            .execute()
        )
        for r in regs:
            eid = r.get('event_id')
            # Đăng ký đã huỷ không chiếm chỗ — phải khớp với cách đếm ở
            # event_service._registration_counts và registration_service.
            if str(r.get('registration_status') or '').upper() == 'CANCELLED':
                continue
            if eid:
                registered_counts[eid] = registered_counts.get(eid, 0) + 1

    for e in events:
        organizer_id = e.get('organizer_id')
        e['registered_count'] = registered_counts.get(e.get('event_id'), 0)
        e['category_name'] = id_to_category.get(e.get('category_id'))
        e['department_name'] = id_to_dept.get(organizer_id)
        e['organizer_name'] = id_to_name.get(organizer_id)

    # Step 6: sorting
    if sort_by == 'Nổi nhất':
        events.sort(key=lambda x: x.get('registered_count', 0), reverse=True)
    elif sort_by == 'Sắp diễn ra':
        events.sort(key=lambda x: x.get('start_time') or '')
    else:
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
