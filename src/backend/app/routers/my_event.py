from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.history import CancelRegistrationResponse, HistoryResponse
from app.services.history_services import (
    cancel_registration_service,
    get_event_history_service,
)

router = APIRouter(prefix="/api", tags=["Lịch sử sự kiện"])


@router.get(
    "/my-events",
    response_model=list[HistoryResponse],
    summary="Xem lịch sử sự kiện",
)
def get_event_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_event_history_service(
        db=db,
        current_user=current_user,
    )


@router.patch(
    "/registrations/{registration_id}/cancel",
    response_model=CancelRegistrationResponse,
    summary="Hủy đăng ký sự kiện",
)
def cancel_registration(
    registration_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return cancel_registration_service(
        registration_id=registration_id,
        current_user=current_user,
        db=db,
    )
