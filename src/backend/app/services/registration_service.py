import uuid

from app.core.supabase_client import get_supabase
from app.models.enum import NotificationType
from app.services import notification_service

TABLE = "event_registrations"


def get_registration_count(event_id: str) -> int:
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select("registration_id", count="exact", head=True)
        .eq("event_id", event_id)
        .neq("registration_status", "CANCELLED")
        .neq("registration_status", "WAITLISTED")
        .execute()
    )
    return response.count or 0


def find_registration(event_id: str, user_id: str, include_cancelled: bool = True):
    supabase = get_supabase()
    query = (
        supabase.table(TABLE)
        .select("registration_id, registration_status")
        .eq("event_id", event_id)
        .eq("user_id", user_id)
    )
    if not include_cancelled:
        query = query.neq("registration_status", "CANCELLED")

    response = (
        query
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if response and response.data and len(response.data) > 0:
        return response.data[0]
    return None


def is_user_registered(event_id: str, user_id: str) -> bool:
    return find_registration(event_id, user_id, include_cancelled=False) is not None


def register_user(
    event_id: str,
    user_id: str,
    event_title: str | None = None,
    registration_status: str = "REGISTERED",
) -> bool:
    """Register the user for the event.

    Returns True if the user was already actively registered (no-op), False if a new
    or reactivated registration row was processed.
    """
    existing = find_registration(event_id, user_id, include_cancelled=True)
    if existing:
        st = str(existing.get("registration_status", "")).upper()
        if st != "CANCELLED":
            return True

        # Reactivate cancelled registration row
        supabase = get_supabase()
        supabase.table(TABLE).update(
            {"registration_status": registration_status}
        ).eq("registration_id", existing["registration_id"]).execute()
    else:
        supabase = get_supabase()
        supabase.table(TABLE).insert(
            {
                "registration_id": str(uuid.uuid4()),
                "event_id": event_id,
                "user_id": user_id,
                "registration_status": registration_status,
            }
        ).execute()

    display_title = event_title or "Sự kiện"

    is_waitlist = registration_status in ("WAITLISTED", "waitlisted")
    noti_type = (
        NotificationType.WAITLIST_JOINED
        if is_waitlist
        else NotificationType.REGISTRATION_CONFIRMED
    )
    noti_title = (
        "Đã vào danh sách chờ"
        if is_waitlist
        else "Đăng ký sự kiện thành công"
    )
    noti_content = (
        f'Bạn đã được thêm vào danh sách chờ của sự kiện "{display_title}".'
        if is_waitlist
        else f'Bạn đã đăng ký thành công sự kiện "{display_title}".'
    )

    notification_service.create_notification(
        user_id=user_id,
        event_id=event_id,
        notification_type=noti_type,
        title=noti_title,
        content=noti_content,
    )
    return False
