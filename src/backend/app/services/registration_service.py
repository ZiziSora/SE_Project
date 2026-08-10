import uuid

from app.core.supabase_client import get_supabase

TABLE = "event_registrations"


def get_registration_count(event_id: str) -> int:
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select("registration_id", count="exact", head=True)
        .eq("event_id", event_id)
        .neq("registration_status", "CANCELLED")
        .execute()
    )
    return response.count or 0


def find_registration(event_id: str, user_id: str):
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select("registration_id, registration_status")
        .eq("event_id", event_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data if response else None


def is_user_registered(event_id: str, user_id: str) -> bool:
    return find_registration(event_id, user_id) is not None


def register_user(event_id: str, user_id: str) -> bool:
    """Register the user for the event.

    Returns True if the user was already registered (no-op), False if a new
    registration row was created.
    """
    existing = find_registration(event_id, user_id)
    if existing:
        return True

    supabase = get_supabase()
    supabase.table(TABLE).insert(
        {
            "registration_id": str(uuid.uuid4()),
            "event_id": event_id,
            "user_id": user_id,
            "registration_status": "REGISTERED",
        }
    ).execute()
    return False
