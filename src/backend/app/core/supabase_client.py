from functools import lru_cache

from supabase import Client, create_client

from app.core.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL


@lru_cache
def get_supabase() -> Client:
    """Server-side Supabase client using the service role key.

    Only ever used from backend code — this key bypasses Row Level Security,
    so it must never be sent to or used by the frontend.
    """
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
