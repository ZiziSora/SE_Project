from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase_auth.types import User

from app.core.app_time import is_waitlist_open
from app.core.security import get_current_user, require_current_user
from app.schemas.event import EventOut
from app.schemas.registration import RegisterResponseOut, RegistrationStatusOut
from app.schemas.saved_event import (
    RemoveSavedEventResponseOut,
    SavedEventOut,
    SavedEventStatusOut,
    SaveEventResponseOut,
)
from app.services import (
    event_service,
    registration_service,
    saved_event_service,
)
from app.services.event_services import get_filtered_events_service

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
@router.get("/")
def get_events(
    search_term: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sort_by: str = Query("Sắp diễn ra"),
    page: int = Query(1, ge=1, description="Trang hiện tại (bắt đầu từ 1)"),
    limit: int = Query(
        10,
        ge=1,
        le=100,
        description="Số lượng sự kiện mỗi trang (tối đa 100)",
    ),
) -> Dict[str, Any]:
    return get_filtered_events_service(
        search_term=search_term,
        category=category,
        sort_by=sort_by,
        page=page,
        limit=limit,
    )


@router.get("/ongoing", response_model=list[EventOut])
def read_ongoing_events() -> list[EventOut]:
    return event_service.list_ongoing_events()


@router.get("/saved", response_model=list[SavedEventOut])
def read_saved_events(
    current_user: User = Depends(require_current_user),
) -> list[SavedEventOut]:
    return saved_event_service.list_saved_events(current_user.id)


@router.get("/{event_id}", response_model=EventOut)
def read_event(event_id: str) -> EventOut:
    event = event_service.get_event_by_id(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Không tìm thấy sự kiện với ID "{event_id}".',
        )
    return event


@router.get("/{event_id}/registration-status", response_model=RegistrationStatusOut)
def read_registration_status(
    event_id: str,
    current_user: Optional[User] = Depends(get_current_user),
) -> RegistrationStatusOut:
    event = event_service.get_event_by_id(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Không tìm thấy sự kiện với ID "{event_id}".',
        )

    count = registration_service.get_registration_count(event_id)
    reg_record = (
        registration_service.find_registration(event_id, current_user.id, include_cancelled=True)
        if current_user
        else None
    )
    user_status = reg_record.get("registration_status") if reg_record else None
    registered = reg_record is not None and str(user_status).upper() != "CANCELLED"

    return RegistrationStatusOut(
        count=count,
        capacity=event.capacity,
        registered=registered,
        status=user_status,
    )


@router.post("/{event_id}/register", response_model=RegisterResponseOut)
def register_for_event(
    event_id: str,
    current_user: User = Depends(require_current_user),
) -> RegisterResponseOut:
    event = event_service.get_event_by_id(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Không tìm thấy sự kiện với ID "{event_id}".',
        )

    # `get_event_by_id` cố tình trả về cả sự kiện đã huỷ / đã đóng để trang chi
    # tiết còn mở được từ thông báo huỷ. Nhưng ĐĂNG KÝ thì phải chặn ở đây.
    if str(event.event_status or "").upper() != event_service.DB_PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sự kiện này đã bị huỷ hoặc đã kết thúc nên không thể đăng ký.",
        )

    count = registration_service.get_registration_count(event_id)
    active_reg = registration_service.find_registration(event_id, current_user.id, include_cancelled=False)
    already_registered = active_reg is not None

    is_full = event.capacity is not None and count >= event.capacity

    # Sinh viên chính thức chỉ huỷ được khi sự kiện còn cách ít nhất 5 ngày.
    # Qua mốc đó không ai nhả chỗ nữa, nên nhận thêm người vào danh sách chờ
    # là hứa suông — họ không bao giờ được đôn lên chính thức.
    if is_full and not already_registered and not is_waitlist_open(event.start_time):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Sự kiện đã đủ số lượng và đã quá hạn huỷ đăng ký "
                "(trước ngày diễn ra 5 ngày) nên không còn nhận danh sách chờ."
            ),
        )

    target_status = "WAITLISTED" if is_full else "REGISTERED"

    was_already_registered = registration_service.register_user(
        event_id,
        current_user.id,
        event.title,
        registration_status=target_status,
        event_organizer_id=(
            event.organizer.organizer_id if event.organizer else None
        ),
    )
    if not was_already_registered and not is_full:
        count += 1

    return RegisterResponseOut(
        already_registered=was_already_registered,
        count=count,
        is_waitlisted=is_full,
        registration_status=target_status if not was_already_registered else (active_reg.get("registration_status") if active_reg else target_status),
    )


@router.get("/{event_id}/saved-status", response_model=SavedEventStatusOut)
def read_saved_status(
    event_id: str,
    current_user: Optional[User] = Depends(get_current_user),
) -> SavedEventStatusOut:
    event = event_service.get_event_by_id(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Không tìm thấy sự kiện với ID "{event_id}".',
        )

    saved = (
        saved_event_service.is_event_saved(event_id, current_user.id)
        if current_user
        else False
    )
    return SavedEventStatusOut(saved=saved)


@router.post("/{event_id}/save", response_model=SaveEventResponseOut)
def bookmark_event(
    event_id: str,
    current_user: User = Depends(require_current_user),
) -> SaveEventResponseOut:
    event = event_service.get_event_by_id(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Không tìm thấy sự kiện với ID "{event_id}".',
        )

    already_saved = saved_event_service.save_event(event_id, current_user.id)
    return SaveEventResponseOut(saved=True, already_saved=already_saved)


@router.delete("/{event_id}/save", response_model=RemoveSavedEventResponseOut)
def unbookmark_event(
    event_id: str,
    current_user: User = Depends(require_current_user),
) -> RemoveSavedEventResponseOut:
    removed = saved_event_service.remove_saved_event(event_id, current_user.id)
    return RemoveSavedEventResponseOut(removed=removed)
