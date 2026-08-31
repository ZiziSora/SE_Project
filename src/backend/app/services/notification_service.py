"""Business logic for in-app UniEvent notifications."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from math import ceil
from typing import Any

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.core.supabase_client import get_supabase
from app.models.enum import NotificationType, UserRole, UserStatus


TABLE_NOTIFICATIONS = "notifications"
TABLE_EVENTS = "events"
TABLE_REGISTRATIONS = "event_registrations"
TABLE_USERS = "users"
ACTIVE_REGISTRATION_STATUSES = ["REGISTERED", "CHECKED_IN"]


def _run(query):
    try:
        return query.execute()
    except APIError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể xử lý thông báo.",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dịch vụ thông báo đang tạm thời không khả dụng.",
        ) from error


def _normalize_notification(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "notification_id": row.get("noti_id"),
        "user_id": row.get("user_id"),
        "event_id": row.get("event_id"),
        "title": row.get("title") or "Thông báo",
        "type": row.get("type") or NotificationType.EVENT_UPDATED.name,
        "is_read": bool(row.get("is_read")),
        "created_at": row.get("created_at"),
        "content": row.get("content") or "",
    }


def list_notifications(
    user_id: str,
    *,
    page: int,
    page_size: int,
) -> dict[str, Any]:
    start = (page - 1) * page_size
    end = start + page_size - 1
    response = _run(
        get_supabase()
        .table(TABLE_NOTIFICATIONS)
        .select("*", count="exact")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(start, end)
    )
    rows = response.data or []
    total = response.count or 0
    return {
        "items": [_normalize_notification(row) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total else 0,
    }


def get_unread_count(user_id: str) -> dict[str, int]:
    response = _run(
        get_supabase()
        .table(TABLE_NOTIFICATIONS)
        .select("noti_id", count="exact", head=True)
        .eq("user_id", user_id)
        .eq("is_read", False)
    )
    return {"unread_count": response.count or 0}


def get_notification(notification_id: str, user_id: str) -> dict[str, Any]:
    response = _run(
        get_supabase()
        .table(TABLE_NOTIFICATIONS)
        .select("*")
        .eq("noti_id", notification_id)
        .eq("user_id", user_id)
        .maybe_single()
    )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo.",
        )
    return _normalize_notification(response.data)


def mark_notification_read(
    notification_id: str,
    user_id: str,
) -> dict[str, Any]:
    response = _run(
        get_supabase()
        .table(TABLE_NOTIFICATIONS)
        .update({"is_read": True})
        .eq("noti_id", notification_id)
        .eq("user_id", user_id)
    )
    rows = response.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo.",
        )
    return _normalize_notification(rows[0])


def delete_notification(
    notification_id: str,
    user_id: str,
) -> dict[str, int]:
    response = _run(
        get_supabase()
        .table(TABLE_NOTIFICATIONS)
        .delete()
        .eq("noti_id", notification_id)
        .eq("user_id", user_id)
    )
    if not (response.data or []):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo.",
        )
    return {"deleted_count": 1}


def delete_notifications(
    notification_ids: list[str],
    user_id: str,
) -> dict[str, int]:
    unique_ids = list(dict.fromkeys(str(item) for item in notification_ids))
    if not unique_ids:
        return {"deleted_count": 0}

    response = _run(
        get_supabase()
        .table(TABLE_NOTIFICATIONS)
        .delete()
        .eq("user_id", user_id)
        .in_("noti_id", unique_ids)
    )
    return {"deleted_count": len(response.data or [])}


def create_notification(
    *,
    user_id: str,
    event_id: str | None,
    notification_type: NotificationType,
    title: str,
    content: str,
) -> None:
    payload = {
        "noti_id": str(uuid.uuid4()),
        "user_id": str(user_id),
        "event_id": str(event_id) if event_id else None,
        "title": title,
        "type": notification_type.name,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "content": content,
    }
    _run(get_supabase().table(TABLE_NOTIFICATIONS).insert(payload))


def create_notifications(
    *,
    user_ids: list[str],
    event_id: str,
    notification_type: NotificationType,
    title: str,
    content: str,
) -> int:
    unique_user_ids = list(dict.fromkeys(str(user_id) for user_id in user_ids))
    if not unique_user_ids:
        return 0

    created_at = datetime.now(timezone.utc).isoformat()
    payload = [
        {
            "noti_id": str(uuid.uuid4()),
            "user_id": user_id,
            "event_id": str(event_id),
            "title": title,
            "type": notification_type.name,
            "is_read": False,
            "created_at": created_at,
            "content": content,
        }
        for user_id in unique_user_ids
    ]
    _run(get_supabase().table(TABLE_NOTIFICATIONS).insert(payload))
    return len(payload)


def notify_admins_event_pending(*, event_id: str, event_title: str) -> int:
    response = _run(
        get_supabase()
        .table(TABLE_USERS)
        .select("user_id")
        .eq("role", UserRole.ADMIN.value)
        .eq("status", UserStatus.ACTIVE.value)
    )
    admin_ids = [
        str(row["user_id"])
        for row in (response.data or [])
        if row.get("user_id")
    ]
    return create_notifications(
        user_ids=admin_ids,
        event_id=event_id,
        notification_type=NotificationType.NEW_EVENT,
        title="Sự kiện mới cần duyệt",
        content=(
            f"Ban tổ chức đã gửi sự kiện “{event_title}” "
            "và đang chờ quản trị viên xét duyệt."
        ),
    )


def notify_admins_organizer_request_pending(
    *,
    organizer_name: str,
) -> int:
    response = _run(
        get_supabase()
        .table(TABLE_USERS)
        .select("user_id")
        .eq("role", UserRole.ADMIN.value)
        .eq("status", UserStatus.ACTIVE.value)
    )
    admin_ids = [
        str(row["user_id"])
        for row in (response.data or [])
        if row.get("user_id")
    ]
    for admin_id in admin_ids:
        create_notification(
            user_id=admin_id,
            event_id=None,
            notification_type=NotificationType.NEW_ORGANIZER_REQUEST,
            title="Yêu cầu Ban tổ chức mới",
            content=(
                f"Ban tổ chức “{organizer_name}” đã gửi hồ sơ "
                "và đang chờ quản trị viên xét duyệt."
            ),
        )
    return len(admin_ids)


def sync_pending_event_reviews_for_admin(user_id: str) -> int:
    admin_response = _run(
        get_supabase()
        .table(TABLE_USERS)
        .select("user_id")
        .eq("user_id", user_id)
        .eq("role", UserRole.ADMIN.value)
        .eq("status", UserStatus.ACTIVE.value)
        .maybe_single()
    )
    if not admin_response.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn cần có quyền quản trị viên.",
        )

    pending_response = _run(
        get_supabase()
        .table(TABLE_EVENTS)
        .select("event_id, title")
        .eq("event_status", "DRAFT")
        .eq("approval_status", "PENDING")
    )
    pending_events = [
        event for event in (pending_response.data or []) if event.get("event_id")
    ]
    if not pending_events:
        return 0

    event_ids = [str(event["event_id"]) for event in pending_events]
    existing_response = _run(
        get_supabase()
        .table(TABLE_NOTIFICATIONS)
        .select("event_id")
        .eq("user_id", user_id)
        .eq("type", NotificationType.NEW_EVENT.name)
        .in_("event_id", event_ids)
    )
    notified_event_ids = {
        str(row["event_id"])
        for row in (existing_response.data or [])
        if row.get("event_id")
    }

    created_count = 0
    for event in pending_events:
        event_id = str(event["event_id"])
        if event_id in notified_event_ids:
            continue
        event_title = event.get("title") or "Sự kiện"
        create_notification(
            user_id=user_id,
            event_id=event_id,
            notification_type=NotificationType.NEW_EVENT,
            title="Sự kiện mới cần duyệt",
            content=(
                f"Ban tổ chức đã gửi sự kiện “{event_title}” "
                "và đang chờ quản trị viên xét duyệt."
            ),
        )
        created_count += 1
    return created_count


def _registered_user_ids(event_id: str) -> list[str]:
    response = _run(
        get_supabase()
        .table(TABLE_REGISTRATIONS)
        .select("user_id")
        .eq("event_id", event_id)
        .in_("registration_status", ACTIVE_REGISTRATION_STATUSES)
    )
    return [
        str(row["user_id"])
        for row in (response.data or [])
        if row.get("user_id")
    ]


def notify_event_participants(
    *,
    event_id: str,
    notification_type: NotificationType,
    title: str,
    content: str,
) -> int:
    return create_notifications(
        user_ids=_registered_user_ids(event_id),
        event_id=event_id,
        notification_type=notification_type,
        title=title,
        content=content,
    )


def send_event_reminder(
    *,
    event_id: str,
    organizer_id: str,
    title: str | None,
    content: str,
) -> dict[str, Any]:
    response = _run(
        get_supabase()
        .table(TABLE_EVENTS)
        .select("event_id, title, event_status")
        .eq("event_id", event_id)
        .eq("organizer_id", organizer_id)
        .maybe_single()
    )
    event = response.data
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sự kiện thuộc quyền quản lý của bạn.",
        )

    event_status = str(event.get("event_status") or "").upper()
    if event_status in {"CANCELLED", "COMPLETED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Không thể gửi nhắc lịch cho sự kiện đã kết thúc hoặc đã huỷ.",
        )

    event_title = event.get("title") or "Sự kiện"
    recipient_count = notify_event_participants(
        event_id=event_id,
        notification_type=NotificationType.EVENT_REMINDER,
        title=title or f"Nhắc lịch: {event_title}",
        content=content,
    )
    return {
        "message": "Đã tạo thông báo nhắc lịch.",
        "recipient_count": recipient_count,
    }
