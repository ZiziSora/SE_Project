from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.database import get_db
from app.models.enum import OrganizerRequestStatus
from app.models.user import User
from app.schemas.organizer_request import (
    OrganizerRequestDecisionRequest,
    OrganizerRequestDecisionResponse,
    OrganizerRequestListResponse,
    OrganizerRequestResponse,
)
from app.services.organizer_request_service import (
    get_organizer_request,
    list_organizer_requests,
    review_organizer_request,
)

router = APIRouter(
    prefix="/api/admin/organizer-requests",
    tags=["Admin Organizer Requests"],
)


@router.get("", response_model=OrganizerRequestListResponse)
def list_requests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: str | None = Query(default=None, max_length=200),
    status_filter: OrganizerRequestStatus | None = Query(
        default=None,
        alias="status",
    ),
    _current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return list_organizer_requests(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status_filter,
    )


@router.get("/{request_id}", response_model=OrganizerRequestResponse)
def get_request(
    request_id: UUID,
    _current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return get_organizer_request(db=db, request_id=request_id)


@router.patch(
    "/{request_id}/decision",
    response_model=OrganizerRequestDecisionResponse,
)
def decide_request(
    request_id: UUID,
    body: OrganizerRequestDecisionRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    reviewed_request = review_organizer_request(
        db=db,
        request_id=request_id,
        decision=OrganizerRequestStatus(body.status),
        admin_id=current_admin.user_id,
        decision_reason=body.reason,
    )
    return {
        "message": (
            "Đã chấp nhận yêu cầu ban tổ chức."
            if body.status == "approved"
            else "Đã từ chối yêu cầu ban tổ chức."
        ),
        "request": reviewed_request,
    }
