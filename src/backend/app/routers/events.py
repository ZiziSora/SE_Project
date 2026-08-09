"""Endpoints quản lý sự kiện dành cho Ban tổ chức (Organizer)."""
from typing import Optional

from fastapi import APIRouter, Query, Response, status

from ..schemas import (
    EventCreate,
    EventListOut,
    EventOut,
    EventStatusUpdate,
    EventUpdate,
    StatsOut,
)
from ..services import event_service

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=EventListOut, summary="Danh sách sự kiện (lọc/tìm/phân trang)")
def list_events(
    search: Optional[str] = Query(None, description="Tìm theo tên sự kiện"),
    status_filter: Optional[str] = Query(
        None, alias="status", description="DRAFT | PENDING | PUBLISHED | ONGOING | ENDED | CANCELLED | ALL"
    ),
    organizer_id: Optional[str] = Query(None),
    sort: str = Query("newest", description="newest | oldest | title | created"),
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=100),
):
    return event_service.list_events(
        search=search,
        status_filter=status_filter,
        organizer_id=organizer_id,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=StatsOut, summary="Số liệu thống kê Dashboard")
def get_stats(organizer_id: Optional[str] = Query(None)):
    return event_service.get_stats(organizer_id)


@router.get("/locations", response_model=list[str], summary="Gợi ý địa điểm")
def list_locations():
    return event_service.list_locations()


@router.get("/{event_id}", response_model=EventOut, summary="Chi tiết sự kiện")
def get_event(event_id: str):
    return event_service.get_event(event_id)


@router.post(
    "",
    response_model=EventOut,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo sự kiện (DRAFT hoặc PENDING chờ duyệt)",
)
def create_event(payload: EventCreate):
    return event_service.create_event(payload)


@router.put("/{event_id}", response_model=EventOut, summary="Cập nhật sự kiện")
def update_event(event_id: str, payload: EventUpdate):
    return event_service.update_event(event_id, payload)


@router.patch(
    "/{event_id}/status", response_model=EventOut, summary="Đổi trạng thái sự kiện"
)
def change_status(event_id: str, payload: EventStatusUpdate):
    return event_service.change_status(event_id, payload.event_status)


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Xoá sự kiện",
)
def delete_event(event_id: str):
    event_service.delete_event(event_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
