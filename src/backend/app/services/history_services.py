"""Services for event history and registration cancellation."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.event import Event
from app.models.enum import RegistrationStatus
from app.models.registration import EventRegistration
from app.models.user import User
from app.schemas.history import (
    CancelledRegistrationResponse,
    CancelRegistrationResponse,
    HistoryCategoryResponse,
    HistoryEventResponse,
    HistoryResponse,
)


def _enum_name(value: object | None) -> str | None:
    """Return the database enum name used by the frontend API contract."""
    if value is None:
        return None
    return getattr(value, "name", str(value))


def _registration_status_name(value: object | None) -> str | None:
    if value is None:
        return None

    status_name = getattr(value, "name", str(value)).upper().replace("-", "_")
    if status_name == "CHECK_IN":
        return "CHECKED_IN"
    return status_name


def _build_event_response(event: Event | None) -> HistoryEventResponse | None:
    if event is None:
        return None

    category = None
    if event.category is not None:
        category = HistoryCategoryResponse(
            category_id=event.category.category_id,
            name=event.category.name,
        )

    return HistoryEventResponse(
        event_id=event.event_id,
        title=event.title,
        description=event.description,
        location=event.location,
        start_time=event.start_time,
        end_time=event.end_time,
        registration_deadline=event.registration_deadline,
        capacity=event.capacity,
        event_status=_enum_name(event.event_status),
        banner_url=event.banner_url,
        event_categories=category,
    )


def get_event_history_service(
    db: Session,
    current_user: User,
) -> list[HistoryResponse]:
    """Get every event registration belonging to the authenticated user."""
    registrations = (
        db.query(EventRegistration)
        .options(
            joinedload(EventRegistration.event).joinedload(Event.category),
        )
        .filter(EventRegistration.user_id == current_user.user_id)
        .order_by(EventRegistration.created_at.desc())
        .all()
    )

    return [
        HistoryResponse(
            registration_id=registration.registration_id,
            user_id=registration.user_id,
            event_id=registration.event_id,
            registration_status=_registration_status_name(
                registration.registration_status,
            ),
            created_at=registration.created_at,
            events=_build_event_response(registration.event),
        )
        for registration in registrations
    ]


def cancel_registration_service(
    registration_id: UUID,
    current_user: User,
    db: Session,
) -> CancelRegistrationResponse:
    try:
        # Lấy đăng ký cùng ngày bắt đầu sự kiện, đồng thời kiểm tra quyền sở hữu.
        registration = (
            db.query(EventRegistration)
            .options(joinedload(EventRegistration.event))
            .filter(
                EventRegistration.registration_id == registration_id,
                EventRegistration.user_id == current_user.user_id,
            )
            .first()
        )

        if registration is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin đăng ký.",
            )

        start_time = (
            registration.event.start_time
            if registration.event is not None
            else None
        )

        if start_time is not None:
            # Database hiện dùng DateTime không kèm timezone; giữ quy ước UTC
            # giống với implementation Supabase ban đầu.
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            else:
                start_time = start_time.astimezone(timezone.utc)

            now = datetime.now(timezone.utc)
            if start_time - now < timedelta(days=5):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Chỉ có thể hủy đăng ký trước khi sự kiện diễn ra "
                        "ít nhất 5 ngày."
                    ),
                )

        registration.registration_status = RegistrationStatus.CANCELLED
        db.commit()
        db.refresh(registration)

        return CancelRegistrationResponse(
            message="Registration cancelled successfully",
            data=[
                CancelledRegistrationResponse(
                    registration_id=registration.registration_id,
                    registration_status="CANCELLED",
                )
            ],
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể hủy đăng ký sự kiện.",
        ) from error
