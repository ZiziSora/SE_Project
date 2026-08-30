from datetime import datetime, timezone
from typing import Optional

from app.core.supabase_client import get_supabase

TABLE = "saved_events"


def find_saved(event_id: str, student_id: str) -> Optional[dict]:
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select("event_id, student_id, saved_at")
        .eq("event_id", event_id)
        .eq("student_id", student_id)
        .maybe_single()
        .execute()
    )
    return response.data if response else None


def is_event_saved(event_id: str, student_id: str) -> bool:
    return find_saved(event_id, student_id) is not None


def save_event(event_id: str, student_id: str) -> bool:
    """Bookmark the event for the student.

    Returns True if it was already saved (no-op), False if a new row was created.
    """
    existing = find_saved(event_id, student_id)
    if existing:
        return True

    supabase = get_supabase()
    supabase.table(TABLE).insert(
        {
            "event_id": event_id,
            "student_id": student_id,
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()
    return False


def remove_saved_event(event_id: str, student_id: str) -> bool:
    """Remove a bookmark. Returns True if a row was removed, False if none existed."""
    existing = find_saved(event_id, student_id)
    if not existing:
        return False

    supabase = get_supabase()
    supabase.table(TABLE).delete().eq("event_id", event_id).eq(
        "student_id", student_id
    ).execute()
    return True


def _parse_datetime(dt_val) -> Optional[datetime]:
    if not dt_val:
        return None
    if isinstance(dt_val, datetime):
        dt = dt_val
    elif isinstance(dt_val, str):
        try:
            dt = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def is_saved_event_expired(item: dict, now: Optional[datetime] = None) -> bool:
    if not item:
        return True

    if "events" in item and item["events"] is None:
        return True

    event = item.get("events")
    if not event or not isinstance(event, dict):
        return False

    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    reg_deadline = _parse_datetime(event.get("registration_deadline"))
    start_time = _parse_datetime(event.get("start_time"))

    if reg_deadline is not None:
        return reg_deadline < now
    if start_time is not None:
        return start_time < now

    return False


def list_saved_events(student_id: str) -> list:
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select("*, events(*)")
        .eq("student_id", student_id)
        .order("saved_at", desc=True)
        .execute()
    )
    raw_data = response.data if response else []
    now = datetime.now(timezone.utc)
    return [item for item in raw_data if not is_saved_event_expired(item, now)]

