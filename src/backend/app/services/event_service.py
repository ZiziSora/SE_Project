from typing import Optional

from app.core.supabase_client import get_supabase
from app.schemas.event import EventOut

EVENT_SELECT = "*, event_categories(name)"


def get_event_by_id(event_id: str) -> Optional[EventOut]:
    supabase = get_supabase()
    response = (
        supabase.table("events")
        .select(EVENT_SELECT)
        .eq("event_id", event_id)
        .maybe_single()
        .execute()
    )

    if response is None or not response.data:
        return None

    data = dict(response.data)
    category = data.pop("event_categories", None)
    data["category_name"] = category.get("name") if category else None

    return EventOut(**data)
