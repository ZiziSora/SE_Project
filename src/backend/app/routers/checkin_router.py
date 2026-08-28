from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_approved_organizer
from app.database import get_db
from app.models.user import User
from app.schemas.checkin import (
    CheckinRequest,
    CheckinSuccessResponse,
    EventCheckinStatsResponse,
    QRDetailResponse,
)
from app.services.checkin_service import (
    get_event_checkin_stats,
    get_user_event_qr,
    process_checkin,
)

router = APIRouter(prefix="/api/checkin", tags=["Check-in sự kiện"])


@router.post(
    "",
    response_model=CheckinSuccessResponse,
    summary="Thực hiện check-in cho người tham dự bằng mã QR hoặc mã thủ công",
)
@router.post(
    "/",
    response_model=CheckinSuccessResponse,
    include_in_schema=False,
)
def checkin_participant(
    payload: CheckinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckinSuccessResponse:
    return process_checkin(
        db=db,
        code=payload.code,
        current_user=current_user,
        event_id=payload.event_id,
    )


@router.get(
    "/events/{event_id}/my-qr",
    response_model=QRDetailResponse,
    summary="Lấy thông tin mã QR và mã thủ công của sinh viên cho sự kiện",
)
def get_my_event_qr(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QRDetailResponse:
    return get_user_event_qr(
        db=db,
        current_user=current_user,
        event_id=event_id,
    )


@router.get(
    "/events/{event_id}/stats",
    response_model=EventCheckinStatsResponse,
    summary="Lấy thống kê và danh sách check-in sự kiện dành cho Ban tổ chức",
)
def get_event_checkin_statistics(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EventCheckinStatsResponse:
    return get_event_checkin_stats(
        db=db,
        event_id=event_id,
        current_user=current_user,
    )
