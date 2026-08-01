from fastapi import APIRouter, Query
from typing import Optional, Dict, Any
from app.services.event_services import get_filtered_events_service

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get('')
@router.get('/')
def get_events(
    search_term: Optional[str] = Query(None),
    faculty: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sort_by: str = Query('Mới nhất'),
    page: int = Query(1, ge=1, description="Trang hiện tại (bắt đầu từ 1)"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng sự kiện mỗi trang (tối đa 100)")
) -> Dict[str, Any]:
    
    return get_filtered_events_service(
        search_term=search_term,
        faculty=faculty,
        category=category,
        sort_by=sort_by,
        page=page,
        limit=limit
    )