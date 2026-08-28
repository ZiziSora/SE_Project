from typing import Optional, Dict, Any
from app.database import supabase

def get_filtered_events_service(
    search_term: Optional[str] = None,
    faculty: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = 'Mới nhất',
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

    # Step 4: faculty filter
    organizer_ids = list({e.get('organizer_id') for e in events if e.get('organizer_id')})

    if faculty and faculty != 'Tất cả' and organizer_ids:
        users_resp = supabase.table('users').select('user_id, department_name').in_('user_id', organizer_ids).execute()
        users = users_resp.data if hasattr(users_resp, 'data') else (users_resp.get('data', []) if isinstance(users_resp, dict) else [])
        id_to_dept = {u['user_id']: u.get('department_name') for u in (users or [])}
        
        normalized_faculty = faculty.strip().lower()
        filtered_events = []
        for e in events:
            dept_name = id_to_dept.get(e.get('organizer_id'))
            if dept_name and dept_name.strip().lower() == normalized_faculty:
                filtered_events.append(e)
        events = filtered_events

    if not events:
        return {
            "total_items": 0,
            "current_page": page,
            "page_size": limit,
            "total_pages": 0,
            "events": []
        }

    # Step 5: get registration counts
    event_ids = [e.get('event_id') for e in events if e.get('event_id')]
    registered_counts: Dict[str, int] = {}
    
    if event_ids:
        regs_resp = supabase.table('event_registrations').select('event_id').in_('event_id', event_ids).execute()
        regs = regs_resp.data if hasattr(regs_resp, 'data') else (regs_resp.get('data', []) if isinstance(regs_resp, dict) else [])
        for r in (regs or []):
            eid = r.get('event_id')
            if eid:
                registered_counts[eid] = registered_counts.get(eid, 0) + 1

    for e in events:
        e['registered_count'] = registered_counts.get(e.get('event_id'), 0)

    # Step 6: sorting
    if sort_by == 'Nổi nhất':
        events.sort(key=lambda x: x.get('registered_count', 0), reverse=True)
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
