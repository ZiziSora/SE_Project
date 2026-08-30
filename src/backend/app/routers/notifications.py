from fastapi import APIRouter, Depends, Query
from supabase_auth.types import User

from app.core.security import require_current_user
from app.schemas.notification import (
    NotificationListOut,
    NotificationOut,
    NotificationSyncOut,
    NotificationUnreadCountOut,
)
from app.services import notification_service


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListOut)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_current_user),
):
    return notification_service.list_notifications(
        str(current_user.id),
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=NotificationUnreadCountOut)
def get_unread_count(
    current_user: User = Depends(require_current_user),
):
    return notification_service.get_unread_count(str(current_user.id))


@router.post("/sync-pending-reviews", response_model=NotificationSyncOut)
def sync_pending_reviews(
    current_user: User = Depends(require_current_user),
):
    created_count = notification_service.sync_pending_event_reviews_for_admin(
        str(current_user.id)
    )
    return {"created_count": created_count}


@router.get("/{notification_id}", response_model=NotificationOut)
def get_notification(
    notification_id: str,
    current_user: User = Depends(require_current_user),
):
    return notification_service.get_notification(
        notification_id,
        str(current_user.id),
    )


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(require_current_user),
):
    return notification_service.mark_notification_read(
        notification_id,
        str(current_user.id),
    )
