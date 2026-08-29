"""Endpoints quản lý sự kiện dành cho Ban tổ chức (Organizer)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.auth import require_approved_organizer
from app.models.user import User
from app.schemas.organizer_event import (
    EventCancelIn,
    EventCreate,
    EventListOut,
    EventStatusUpdate,
    EventUpdate,
    OrganizerEventOut,
    StatsOut,
)
from app.schemas.notification import EventReminderIn, EventReminderOut
from app.services import event_service, notification_service

router = APIRouter(prefix="/api/organizer/events", tags=["organizer_events"])


@router.get("", response_model=EventListOut, summary="Danh sách sự kiện (lọc/tìm/phân trang)")
def list_events(
    search: Optional[str] = Query(None, description="Tìm theo tên sự kiện"),
    status_filter: Optional[str] = Query(
        None, alias="status", description="DRAFT | PENDING | PUBLISHED | ONGOING | ENDED | CANCELLED | ALL"
    ),
    sort: str = Query("newest", description="newest | oldest | title | created"),
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=100),
    current_user: User = Depends(require_approved_organizer),
):
    return event_service.list_events(
        search=search,
        status_filter=status_filter,
        organizer_id=str(current_user.user_id),
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=StatsOut, summary="Số liệu thống kê Dashboard")
def get_stats(current_user: User = Depends(require_approved_organizer)):
    return event_service.get_stats(str(current_user.user_id))


@router.get("/locations", response_model=list[str], summary="Gợi ý địa điểm")
def list_locations(_current_user: User = Depends(require_approved_organizer)):
    return event_service.list_locations()


@router.post(
    "/{event_id}/reminders",
    response_model=EventReminderOut,
    status_code=status.HTTP_201_CREATED,
    summary="Gửi thông báo nhắc lịch cho sinh viên đã đăng ký",
)
def send_event_reminder(
    event_id: str,
    payload: EventReminderIn,
    current_user: User = Depends(require_approved_organizer),
):
    return notification_service.send_event_reminder(
        event_id=event_id,
        organizer_id=str(current_user.user_id),
        title=payload.title,
        content=payload.content,
    )


@router.get(
    "/{event_id}",
    response_model=OrganizerEventOut,
    summary="Chi tiết sự kiện",
)
def get_event(
    event_id: str,
    current_user: User = Depends(require_approved_organizer),
):
    return event_service.get_event(event_id, str(current_user.user_id))


@router.post(
    "",
    response_model=OrganizerEventOut,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo sự kiện (DRAFT hoặc PENDING chờ duyệt)",
)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(require_approved_organizer),
):
    return event_service.create_event(
        payload,
        str(current_user.user_id),
    )


@router.put(
    "/{event_id}",
    response_model=OrganizerEventOut,
    summary="Cập nhật sự kiện",
)
def update_event(
    event_id: str,
    payload: EventUpdate,
    current_user: User = Depends(require_approved_organizer),
):
    return event_service.update_event(
        event_id, payload, str(current_user.user_id)
    )


@router.patch(
    "/{event_id}/status",
    response_model=OrganizerEventOut,
    summary="Đổi trạng thái sự kiện",
)
def change_status(
    event_id: str,
    payload: EventStatusUpdate,
    current_user: User = Depends(require_approved_organizer),
):
    return event_service.change_status(
        event_id, payload.event_status, str(current_user.user_id)
    )


@router.delete(
    "/{event_id}/revision",
    response_model=OrganizerEventOut,
    summary="Rút lại yêu cầu chỉnh sửa đang chờ duyệt",
)
def cancel_pending_revision(
    event_id: str,
    current_user: User = Depends(require_approved_organizer),
):
    return event_service.cancel_pending_revision(
        event_id, str(current_user.user_id)
    )


@router.post(
    "/{event_id}/cancel",
    response_model=OrganizerEventOut,
    summary="Huỷ sự kiện và báo cho sinh viên đã đăng ký",
)
def cancel_event(
    event_id: str,
    payload: EventCancelIn,
    current_user: User = Depends(require_approved_organizer),
):
    return event_service.cancel_event(
        event_id, str(current_user.user_id), payload.reason
    )


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Xoá sự kiện",
)
def delete_event(
    event_id: str,
    current_user: User = Depends(require_approved_organizer),
):
    event_service.delete_event(event_id, str(current_user.user_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
