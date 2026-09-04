from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.event_review import (
    EventApprovalResponse,
    EventRejectResponse,
    EventReviewListResponse,
)
from app.services.event_review_service import (
    approve_event,
    list_pending_events,
    reject_event,
)


router = APIRouter(
    prefix="/api/admin/review-events",
    tags=["Admin review events"],
)


@router.get(
    "",
    response_model=EventReviewListResponse,
    summary="Danh sách sự kiện đang chờ duyệt",
)
def get_pending_events(
    _current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return list_pending_events(db)


@router.patch(
    "/{event_id}/accept",
    response_model=EventApprovalResponse,
    summary="Chấp nhận sự kiện",
)
def accept_event(
    event_id: UUID,
    _current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return {
        "message": "Đã chấp nhận và xuất bản sự kiện.",
        "event": approve_event(db, event_id),
    }


@router.patch(
    "/{event_id}/reject",
    response_model=EventRejectResponse,
    summary="Từ chối sự kiện",
)
def reject_pending_event(
    event_id: UUID,
    _current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return {
        "message": "Đã từ chối sự kiện.",
        "event": reject_event(db, event_id),
    }
