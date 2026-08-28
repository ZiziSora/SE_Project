"""Cấu hình tập trung cho backend UniEvent.

Đọc biến môi trường từ file .env đặt tại src/backend/.env
"""
import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # --- Supabase ---
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    # LƯU Ý: dùng SERVICE_ROLE key ở backend (không bao giờ để lộ ra frontend)
    SUPABASE_KEY: str = os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY"
    ) or os.getenv("SUPABASE_ANON_KEY", "")

    # --- Storage: mỗi loại tệp một bucket riêng ---
    # Ảnh bìa sự kiện (bucket chỉ nhận image/*)
    BANNER_BUCKET: str = os.getenv("SUPABASE_BANNER_BUCKET", "banner_event")
    # Tài liệu kế hoạch sự kiện (bucket chỉ nhận PDF, Word)
    PLAN_BUCKET: str = os.getenv("SUPABASE_PLAN_BUCKET", "event_plan")

    # --- Tên bảng ---
    TABLE_EVENTS: str = "events"
    TABLE_CATEGORIES: str = "event_categories"
    TABLE_REGISTRATIONS: str = "event_registrations"

    # --- CORS: origin của Vite dev server ---
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
        ).split(",")
        if o.strip()
    ]

    # --- Giới hạn upload ---
    MAX_IMAGE_SIZE_MB: int = int(os.getenv("MAX_IMAGE_SIZE_MB", "5"))
    MAX_DOC_SIZE_MB: int = int(os.getenv("MAX_DOC_SIZE_MB", "20"))

    ALLOWED_IMAGE_TYPES: set[str] = {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
    }
    # Phải trùng khớp với "Allowed MIME types" của bucket event_plan trên Supabase,
    # nếu không backend sẽ nhận tệp rồi mới bị Storage từ chối ở bước cuối.
    ALLOWED_DOC_TYPES: set[str] = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()