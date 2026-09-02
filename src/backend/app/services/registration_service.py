import logging
import uuid

from app.core.supabase_client import get_supabase
from app.models.enum import NotificationType
from app.services import notification_service

logger = logging.getLogger(__name__)

TABLE = "event_registrations"

# Trạng thái danh sách chờ từng được ghi bằng nhiều cách khác nhau, phải tra
# đủ cả ba để không bỏ sót người đang xếp hàng.
WAITLIST_STATUSES = ["WAITLISTED", "waitlisted", "WAITLIST"]


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
    event_organizer_id: str | None = None,
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
    if event_organizer_id:
        organizer_title = (
            "Có người tham gia danh sách chờ"
            if is_waitlist
            else "Có người đăng ký sự kiện"
        )
        organizer_content = (
            f'Sự kiện "{display_title}" vừa có một lượt tham gia '
            "danh sách chờ mới."
            if is_waitlist
            else f'Sự kiện "{display_title}" vừa có một lượt đăng ký mới.'
        )
        notification_service.create_notification(
            user_id=event_organizer_id,
            event_id=event_id,
            notification_type=NotificationType.NEW_EVENT_REGISTRATION,
            title=organizer_title,
            content=organizer_content,
        )
    return False


def list_waitlisted(event_id: str) -> list[dict]:
    """Danh sách chờ của sự kiện, ai xếp hàng trước đứng trước."""
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select("registration_id, user_id")
        .eq("event_id", event_id)
        .in_("registration_status", WAITLIST_STATUSES)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data or []


def promote_waitlisted(
    event_id: str,
    capacity: int | None,
    event_title: str | None = None,
) -> list[str]:
    """Đôn người trong danh sách chờ lên chính thức cho tới khi kín sức chứa.

    Gọi mỗi khi sức chứa của sự kiện TĂNG (Ban tổ chức sửa sự kiện chưa công
    khai, hoặc Admin duyệt bản sửa có sức chứa lớn hơn). Không có bước này thì
    ghế vừa mở thêm nằm trống trong khi vẫn còn người xếp hàng — đúng thứ mà
    danh sách chờ sinh ra để tránh.

    `capacity is None` nghĩa là không giới hạn nữa → đôn hết danh sách chờ.
    Trả về danh sách `registration_id` đã được đôn lên.
    """
    seats: int | None = None
    if capacity is not None:
        # Số ghế trống tính theo đúng cách `get_registration_count` đếm: bỏ
        # người đã huỷ và người đang chờ, nếu không sẽ đôn thiếu hoặc đôn thừa.
        seats = int(capacity) - get_registration_count(event_id)
        if seats <= 0:
            return []

    waiting = list_waitlisted(event_id)
    if seats is not None:
        waiting = waiting[:seats]
    if not waiting:
        return []

    supabase = get_supabase()
    display_title = event_title or "Sự kiện"
    promoted: list[str] = []

    for row in waiting:
        registration_id = row.get("registration_id")
        if not registration_id:
            continue
        try:
            (
                supabase.table(TABLE)
                .update({"registration_status": "REGISTERED"})
                .eq("registration_id", registration_id)
                .execute()
            )
        except Exception:  # noqa: BLE001
            logger.exception(
                "Không đôn được đăng ký %s lên chính thức.", registration_id
            )
            continue

        promoted.append(str(registration_id))

        # Thông báo hỏng thì người đó VẪN đã được đôn lên — chỉ ghi log, không
        # để lỗi gửi tin làm hỏng cả vòng lặp.
        user_id = row.get("user_id")
        if not user_id:
            continue
        try:
            notification_service.create_notification(
                user_id=str(user_id),
                event_id=event_id,
                notification_type=NotificationType.WAITLIST_PROMOTED,
                title="Bạn đã được nhận suất tham gia chính thức!",
                content=(
                    f'Ban tổ chức vừa tăng số lượng tham gia của sự kiện '
                    f'"{display_title}". Bạn đã được chuyển từ Danh sách chờ '
                    "sang Danh sách chính thức."
                ),
            )
        except Exception:  # noqa: BLE001
            logger.exception(
                "Không gửi được thông báo đôn danh sách chờ cho %s.", user_id
            )

    return promoted
