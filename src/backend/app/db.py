"""Khởi tạo Supabase client dùng chung cho toàn bộ backend.

Đây là NƠI DUY NHẤT trong hệ thống được phép nói chuyện trực tiếp với Supabase.
Frontend không còn import supabase-js nữa.
"""
from functools import lru_cache

from supabase import Client, create_client

from .config import settings


@lru_cache
def get_supabase() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise RuntimeError(
            "Thiếu SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trong file .env"
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
