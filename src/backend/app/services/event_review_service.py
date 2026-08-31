import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.models.enum import ApprovalStatus, EventStatus, NotificationType
from app.models.event import Event
from app.services import notification_service


logger = logging.getLogger(__name__)


# Huỷ một sự kiện chỉ đổi cột `event_status` sang CANCELLED và GIỮ NGUYÊN
# `approval_status` (để còn biết trước đó đã được duyệt hay chưa — xem
# `event_service._ui_status_to_db`). Vì vậy nếu hàng đợi duyệt chỉ lọc theo
# approval_status thì sự kiện Ban tổ chức đã huỷ vẫn nằm chờ Admin xét duyệt.
# Hai trạng thái dưới đây là "sự kiện không còn gì để duyệt nữa".
CLOSED_EVENT_STATUSES = (
    EventStatus.CANCELLED,
    EventStatus.COMPLETED,
)


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
        "file_url": getattr(event, "file_url", None),
    }


def list_pending_events(db: Session) -> dict:
    """Lấy toàn bộ sự kiện đang chờ quản trị viên xét duyệt."""
    events = (
        db.query(Event)
        .options(
            joinedload(Event.organizer),
            joinedload(Event.category),
        )
        .filter(
            Event.approval_status == ApprovalStatus.PENDING,
            # event_status có thể NULL với dữ liệu cũ → coi như DRAFT
            or_(
                Event.event_status.is_(None),
                Event.event_status.notin_(CLOSED_EVENT_STATUSES),
            ),
        )
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
    # Chặn trường hợp Admin đang mở danh sách cũ thì Ban tổ chức huỷ sự kiện:
    # bấm "Chấp nhận" lúc đó sẽ xuất bản lại một sự kiện đã huỷ.
    if event.event_status in CLOSED_EVENT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Sự kiện này đã bị Ban tổ chức huỷ hoặc đã kết thúc "
                "nên không còn cần xét duyệt."
            ),
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
    result = _commit_review(db, event)
    _notify_event_review_result(
        event,
        notification_type=NotificationType.EVENT_APPROVED,
        title="Sự kiện đã được duyệt",
        content=f'Sự kiện "{event.title or "Sự kiện"}" đã được phê duyệt và công khai.',
    )
    return result


def reject_event(db: Session, event_id: UUID) -> dict:
    """Từ chối sự kiện đang chờ duyệt và đưa về bản nháp để chỉnh sửa."""
    event = _get_pending_event_for_update(db, event_id)
    event.approval_status = ApprovalStatus.REJECTED
    event.event_status = EventStatus.DRAFT
    result = _commit_review(db, event)
    _notify_event_review_result(
        event,
        notification_type=NotificationType.EVENT_REJECTED,
        title="Sự kiện chưa được duyệt",
        content=(
            f'Sự kiện "{event.title or "Sự kiện"}" đã bị từ chối. '
            "Vui lòng chỉnh sửa và gửi duyệt lại."
        ),
    )
    return result


def _notify_event_review_result(
    event: Event,
    *,
    notification_type: NotificationType,
    title: str,
    content: str,
) -> None:
    if not event.organizer_id:
        return
    try:
        notification_service.create_notification(
            user_id=str(event.organizer_id),
            event_id=str(event.event_id),
            notification_type=notification_type,
            title=title,
            content=content,
        )
    except Exception:
        logger.exception(
            "Không thể tạo thông báo kết quả duyệt sự kiện %s.",
            event.event_id,
        )
