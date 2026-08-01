from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from supabase_auth.types import User

from app.core.security import get_current_user, require_current_user
from app.schemas.event import EventOut
from app.schemas.registration import RegisterResponseOut, RegistrationStatusOut
from app.services import event_service, registration_service

router = APIRouter(prefix="/api/events", tags=["events"])


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
    registered = (
        registration_service.is_user_registered(event_id, current_user.id)
        if current_user
        else False
    )

    return RegistrationStatusOut(count=count, capacity=event.capacity, registered=registered)


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

    count = registration_service.get_registration_count(event_id)
    already_registered = registration_service.is_user_registered(event_id, current_user.id)

    if not already_registered and event.capacity is not None and count >= event.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sự kiện đã đủ số lượng đăng ký.",
        )

    already_registered = registration_service.register_user(event_id, current_user.id)
    if not already_registered:
        count += 1

    return RegisterResponseOut(already_registered=already_registered, count=count)
