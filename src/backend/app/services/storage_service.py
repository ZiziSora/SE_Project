"""Xử lý upload ảnh bìa và tệp kế hoạch lên Supabase Storage.

Hai loại tệp nằm ở HAI bucket riêng biệt:
  - `banner_event` : ảnh bìa sự kiện           (bucket chỉ nhận image/*)
  - `event_plan`   : tài liệu kế hoạch sự kiện (bucket chỉ nhận PDF, Word)

URL trả về được lưu vào cột `banner_url` / `file_url` của bảng `events`.
"""
from __future__ import annotations

import mimetypes
import os
import uuid
from datetime import datetime

from fastapi import HTTPException, UploadFile, status

from ..config import settings
from ..db import get_supabase
from app.schemas.upload import UploadOut

# Thư mục con bên trong mỗi bucket, gom tệp theo tháng cho dễ quản lý
BANNER_FOLDER = "banners"
PLAN_FOLDER = "plans"


async def upload_banner(file: UploadFile) -> UploadOut:
    """Ảnh bìa → bucket `banner_event`."""
    return await _upload(
        file,
        bucket=settings.BANNER_BUCKET,
        folder=BANNER_FOLDER,
        allowed_types=settings.ALLOWED_IMAGE_TYPES,
        max_mb=settings.MAX_IMAGE_SIZE_MB,
        label="Ảnh bìa",
    )


async def upload_plan(file: UploadFile) -> UploadOut:
    """Tài liệu kế hoạch → bucket `event_plan`.

    Chỉ nhận PDF / Word, KHÔNG nhận ảnh — bucket event_plan sẽ từ chối image/*.
    """
    return await _upload(
        file,
        bucket=settings.PLAN_BUCKET,
        folder=PLAN_FOLDER,
        allowed_types=settings.ALLOWED_DOC_TYPES,
        max_mb=settings.MAX_DOC_SIZE_MB,
        label="Tệp kế hoạch",
    )


def delete_banner(path: str) -> None:
    _delete(settings.BANNER_BUCKET, path)


def delete_plan(path: str) -> None:
    _delete(settings.PLAN_BUCKET, path)


# ─── Internal ─────────────────────────────────────────────────────────────────


async def _upload(
    file: UploadFile,
    *,
    bucket: str,
    folder: str,
    allowed_types: set[str],
    max_mb: int,
    label: str,
) -> UploadOut:
    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0]
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"{label} không đúng định dạng cho phép ({content_type}).",
        )

    data = await file.read()
    size = len(data)
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"{label} rỗng."
        )
    if size > max_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{label} vượt quá {max_mb}MB.",
        )

    ext = os.path.splitext(file.filename or "")[1].lower() or ""
    object_path = f"{folder}/{datetime.utcnow():%Y%m}/{uuid.uuid4().hex}{ext}"

    storage = get_supabase().storage.from_(bucket)
    try:
        storage.upload(
            path=object_path,
            file=data,
            file_options={"content-type": content_type, "upsert": "false"},
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Lỗi khi tải {label.lower()} lên bucket '{bucket}': {exc}",
        ) from exc

    return UploadOut(
        url=storage.get_public_url(object_path),
        path=object_path,
        bucket=bucket,
        size=size,
        content_type=content_type,
    )


def _delete(bucket: str, path: str) -> None:
    """Xoá 1 object khỏi bucket (dùng khi xoá sự kiện)."""
    try:
        get_supabase().storage.from_(bucket).remove([path])
    except Exception:  # noqa: BLE001 - xoá file phụ, không nên làm hỏng request chính
        pass
