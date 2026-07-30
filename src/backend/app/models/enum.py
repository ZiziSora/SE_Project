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
    EVENT_UPDATED = "event_updated"
    EVENT_CANCELLED = "event_cancelled"
    NEW_EVENT = "new_event"
    WAITLIST_PROMOTED = "waitlist_promoted"