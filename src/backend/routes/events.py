from fastapi import APIRouter, Query
from typing import Optional, Dict, Any
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY') or os.getenv('SUPABASE_PUBLISHED_KEY')

# Khởi tạo Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Khởi tạo Router
router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get('/')
def get_events(
    search_term: Optional[str] = Query(None),
    faculty: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sort_by: str = Query('Mới nhất'),
) -> Dict[str, Any]:
    
    # Step 1: base query for events
    builder = supabase.table('events').select('*')

    # Step 2: search by title using ILIKE
    if search_term:
        builder = builder.ilike('title', f"%{search_term}%")

    # Step 3: category filter
    if category and category != 'Tất cả':
        builder = builder.eq('category_id', category)

    resp = builder.execute()
    events = resp.data if hasattr(resp, 'data') else resp.get('data', [])

    if not events:
        return {"events": []}

    # Step 4: faculty filter
    organizer_ids = list({e.get('organizer_id') for e in events if e.get('organizer_id')})

    if faculty and faculty != 'Tất cả' and organizer_ids:
        users_resp = supabase.table('users').select('user_id, department_name').in_('user_id', organizer_ids).execute()
        users = users_resp.data if hasattr(users_resp, 'data') else users_resp.get('data', [])
        id_to_dept = {u['user_id']: u.get('department_name') for u in users}
        events = [e for e in events if id_to_dept.get(e.get('organizer_id')) == faculty]

    # Step 5: get registration counts
    event_ids = [e.get('event_id') for e in events if e.get('event_id')]
    registered_counts: Dict[str, int] = {}
    
    if event_ids:
        regs_resp = supabase.table('event_registrations').select('event_id').in_('event_id', event_ids).execute()
        regs = regs_resp.data if hasattr(regs_resp, 'data') else regs_resp.get('data', [])
        for r in regs:
            eid = r.get('event_id')
            registered_counts[eid] = registered_counts.get(eid, 0) + 1

    # attach registered_count
    for e in events:
        e['registered_count'] = registered_counts.get(e.get('event_id'), 0)

    # Step 6: sorting
    if sort_by == 'Nổi nhất':
        events.sort(key=lambda x: x.get('registered_count', 0), reverse=True)
    else:
        events.sort(key=lambda x: x.get('created_at') or '', reverse=True)

    return {"events": events}