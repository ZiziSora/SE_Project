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


def list_saved_events(student_id: str) -> list:
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select("*, events(*)")
        .eq("student_id", student_id)
        .order("saved_at", desc=True)
        .execute()
    )
    return response.data if response else []
