import enum

class UserRole(str, enum.Enum):
    STUDENT = "student"
    ORGANIZER = "organizer"
    ADMIN = "admin"


class UserStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"

class RegistrationStatus(str, enum.Enum):
    REGISTERED = "registered"
    CHECKED_IN = "check-in"
    CANCELLED = "cancelled"
    WAITLISTED = "waitlisted"


class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class OrganizerRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class NotificationType(str, enum.Enum):
    REGISTRATION_CONFIRMED = "registration_confirmed"
    REGISTRATION_CANCELLED = "registration_cancelled"
    EVENT_UPDATED = "event_updated"
    EVENT_CANCELLED = "event_cancelled"
    EVENT_REMINDER = "event_reminder"
    EVENT_LOCATION_CHANGED = "event_location_changed"
    EVENT_TIME_CHANGED = "event_time_changed"
    NEW_EVENT = "new_event"
    NEW_ORGANIZER_REQUEST = "new_organizer_request"
    NEW_EVENT_REGISTRATION = "new_event_registration"
    ORGANIZER_REQUEST_APPROVED = "organizer_request_approved"
    ORGANIZER_REQUEST_REJECTED = "organizer_request_rejected"
    EVENT_APPROVED = "event_approved"
    EVENT_REJECTED = "event_rejected"
    WAITLIST_JOINED = "waitlist_joined"
    WAITLIST_PROMOTED = "waitlist_promoted"

class RevisionStatus(str, enum.Enum):
    """Trạng thái của một yêu cầu chỉnh sửa sự kiện (bảng `event_revisions`).

    SUPERSEDED: Ban tổ chức gửi bản sửa mới trong khi bản cũ còn đang chờ duyệt,
    bản cũ được đánh dấu là đã bị thay thế thay vì xoá đi (giữ lịch sử).
    """

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"
