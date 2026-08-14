from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.models.enum import ApprovalStatus, EventStatus
from app.models.event import Event


def _serialize_event(event: Event) -> dict:
    organizer = event.organizer
    category = event.category

    return {
        "event_id": event.event_id,
        "organizer_id": event.organizer_id,
        "organizer_name": organizer.full_name if organizer else None,
        "organizer_department": (
            organizer.department_name if organizer else None
        ),
        "category_id": event.category_id,
        "category_name": category.name if category else None,
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "registration_deadline": event.registration_deadline,
        "capacity": event.capacity,
        "event_status": event.event_status,
        "approval_status": event.approval_status,
        "banner_url": event.banner_url,
    }


def list_pending_events(db: Session) -> dict:
    """Lấy toàn bộ sự kiện đang chờ quản trị viên xét duyệt."""
    events = (
        db.query(Event)
        .options(
            joinedload(Event.organizer),
            joinedload(Event.category),
        )
        .filter(Event.approval_status == ApprovalStatus.PENDING)
        .order_by(Event.start_time.asc(), Event.event_id.asc())
        .all()
    )

    return {
        "items": [_serialize_event(event) for event in events],
        "total": len(events),
    }


def _get_pending_event_for_update(db: Session, event_id: UUID) -> Event:
    event = (
        db.query(Event)
        .filter(Event.event_id == event_id)
        .with_for_update()
        .first()
    )
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sự kiện cần xét duyệt.",
        )
    if event.approval_status != ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sự kiện này đã được xét duyệt trước đó.",
        )
    return event


def _commit_review(db: Session, event: Event) -> dict:
    serialized_event = _serialize_event(event)

    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật kết quả xét duyệt sự kiện.",
        ) from error

    return serialized_event


def approve_event(db: Session, event_id: UUID) -> dict:
    """Chấp nhận một sự kiện đang chờ duyệt và công khai sự kiện đó."""
    event = _get_pending_event_for_update(db, event_id)
    event.approval_status = ApprovalStatus.APPROVED
    event.event_status = EventStatus.PUBLISHED
    return _commit_review(db, event)


def reject_event(db: Session, event_id: UUID) -> dict:
    """Từ chối sự kiện đang chờ duyệt và đưa về bản nháp để chỉnh sửa."""
    event = _get_pending_event_for_update(db, event_id)
    event.approval_status = ApprovalStatus.REJECTED
    event.event_status = EventStatus.DRAFT
    return _commit_review(db, event)
