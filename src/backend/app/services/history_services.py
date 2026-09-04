"""Services for event history and registration cancellation."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import String, cast
from sqlalchemy.orm import Session, joinedload

from app.core.app_time import now_naive_local
from app.core.supabase_client import get_supabase
from app.models.enum import NotificationType, RegistrationStatus
from app.models.event import Event
from app.models.registration import EventRegistration
from app.models.user import User
from app.schemas.history import (
    CancelledRegistrationResponse,
    CancelRegistrationResponse,
    HistoryCategoryResponse,
    HistoryEventResponse,
    HistoryResponse,
)
from app.services import notification_service


def promote_next_waitlisted_participant(
    db: Session,
    event_id: UUID,
    event_title: str | None = None,
) -> EventRegistration | None:
    """Tự động chuyển sinh viên đầu tiên ở danh sách chờ sang danh sách chính thức khi có slot trống."""
    next_waitlist_reg = None
    try:
        next_waitlist_reg = (
            db.query(EventRegistration)
            .options(joinedload(EventRegistration.event))
            .filter(
                EventRegistration.event_id == event_id,
                cast(EventRegistration.registration_status, String).in_([
                    "WAITLISTED",
                    "waitlisted",
                    "WAITLIST",
                ]),
            )
            .order_by(EventRegistration.created_at.asc())
            .first()
        )
    except Exception:
        next_waitlist_reg = (
            db.query(EventRegistration)
            .options(joinedload(EventRegistration.event))
            .filter(
                EventRegistration.event_id == event_id,
                EventRegistration.registration_status.in_([
                    RegistrationStatus.WAITLISTED,
                    "waitlisted",
                    "WAITLISTED",
                    "WAITLIST",
                ]),
            )
            .order_by(EventRegistration.created_at.asc())
            .first()
        )

    promoted_user_id = None
    promoted_reg_id = None

    if next_waitlist_reg:
        next_waitlist_reg.registration_status = RegistrationStatus.REGISTERED
        db.commit()
        db.refresh(next_waitlist_reg)
        promoted_user_id = str(next_waitlist_reg.user_id)
        promoted_reg_id = str(next_waitlist_reg.registration_id)
    else:
        # Search via Supabase REST API in case registration was saved via REST
        try:
            sp = get_supabase()
            res = (
                sp.table("event_registrations")
                .select("registration_id, user_id, registration_status")
                .eq("event_id", str(event_id))
                .order("created_at", desc=False)
                .execute()
            )
            # Lọc phía Python: `.in_()` với nhãn không có trong enum
            # `registration_status` làm hỏng cả câu truy vấn — xem
            # `registration_service.WAITLIST_STATUSES`.
            waiting = [
                r
                for r in (res.data or [])
                if str(r.get("registration_status") or "").upper()
                in ("WAITLISTED", "WAITLIST")
            ]
            if waiting:
                target_reg = waiting[0]
                promoted_reg_id = target_reg["registration_id"]
                promoted_user_id = target_reg["user_id"]
                sp.table("event_registrations").update({
                    "registration_status": "REGISTERED"
                }).eq("registration_id", promoted_reg_id).execute()
        except Exception:
            pass

    if not promoted_user_id:
        return None

    # Sync Supabase status as well
    try:
        if promoted_reg_id:
            get_supabase().table("event_registrations").update({
                "registration_status": "REGISTERED"
            }).eq("registration_id", promoted_reg_id).execute()
    except Exception:
        pass

    display_title = event_title or (
        next_waitlist_reg.event.title if (next_waitlist_reg and next_waitlist_reg.event) else "Sự kiện"
    )
    try:
        notification_service.create_notification(
            user_id=promoted_user_id,
            event_id=str(event_id),
            notification_type=NotificationType.WAITLIST_PROMOTED,
            title="Bạn đã được nhận suất tham gia chính thức!",
            content=f'Một vị trí đã trống và bạn đã được tự động chuyển từ Danh sách chờ sang Danh sách chính thức cho sự kiện "{display_title}".',
        )
    except Exception:
        pass

    return next_waitlist_reg


def _enum_name(value: object | None) -> str | None:
    """Return the database enum name used by the frontend API contract."""
    if value is None:
        return None
    return getattr(value, "name", str(value))


def _registration_status_name(value: object | None) -> str | None:
    if value is None:
        return None

    status_name = getattr(value, "name", str(value)).upper().replace("-", "_")
    if status_name == "CHECK_IN":
        return "CHECKED_IN"
    if status_name in ("WAITLIST", "WAITLISTED"):
        return "WAITLISTED"
    return status_name


def _build_event_response(
    event: Event | None,
    registered_count: int = 0,
) -> HistoryEventResponse | None:
    if event is None:
        return None

    category = None
    if event.category is not None:
        category = HistoryCategoryResponse(
            category_id=event.category.category_id,
            name=event.category.name,
        )

    organizer = getattr(event, "organizer", None)
    organizer_name = None
    if organizer is not None:
        organizer_name = organizer.full_name or organizer.department_name

    return HistoryEventResponse(
        event_id=event.event_id,
        title=event.title,
        description=event.description,
        location=event.location,
        start_time=event.start_time,
        end_time=event.end_time,
        registration_deadline=event.registration_deadline,
        capacity=event.capacity,
        event_status=_enum_name(event.event_status),
        banner_url=event.banner_url,
        event_categories=category,
        organizer_name=organizer_name,
        registered_count=registered_count,
    )


def _registered_counts(db: Session, event_ids: list[UUID]) -> dict[UUID, int]:
    """Số người đang giữ chỗ theo từng sự kiện.

    Đăng ký đã huỷ và người trong danh sách chờ KHÔNG được tính — phải khớp với
    event_services.get_filtered_events_service, event_service._registration_counts
    và registration_service, nếu không thì cùng một sự kiện lại hiện hai con số
    khác nhau ở hai trang.
    """
    if not event_ids:
        return {}

    rows = (
        db.query(EventRegistration.event_id, EventRegistration.registration_status)
        .filter(EventRegistration.event_id.in_(event_ids))
        .all()
    )

    counts: dict[UUID, int] = {}
    for event_id, registration_status in rows:
        if _registration_status_name(registration_status) in (
            "CANCELLED",
            "WAITLISTED",
        ):
            continue
        counts[event_id] = counts.get(event_id, 0) + 1
    return counts


def _is_expired_waitlist(registration: EventRegistration, now: datetime) -> bool:
    """Kiểm tra xem bản ghi danh sách chờ đã hết hạn chưa.

    Theo quy định, sinh viên chính thức chỉ có thể hủy đăng ký trước khi sự kiện diễn ra ít nhất 5 ngày.
    Do đó, sau mốc `start_time - 5 ngày` (hoặc hạn đăng ký / thời gian bắt đầu), không còn ai có thể hủy
    nên sinh viên ở danh sách chờ không còn cơ hội được đôn lên chính thức và sẽ tự động bị ẩn.
    """
    status_name = _registration_status_name(registration.registration_status)
    if status_name != "WAITLISTED":
        return False
    event = registration.event
    if not event:
        return False

    cutoffs: list[datetime] = []
    if event.start_time:
        cutoffs.append(event.start_time - timedelta(days=5))
        cutoffs.append(event.start_time)
    if event.registration_deadline:
        cutoffs.append(event.registration_deadline)

    if not cutoffs:
        return False

    cutoff = min(cutoffs)

    if cutoff.tzinfo is not None:
        now_cmp = now if now.tzinfo is not None else now.replace(tzinfo=timezone.utc)
    else:
        now_cmp = now.replace(tzinfo=None) if now.tzinfo is not None else now

    return cutoff < now_cmp


def get_event_history_service(
    db: Session,
    current_user: User,
) -> list[HistoryResponse]:
    """Get every event registration belonging to the authenticated user.

    Waitlisted registrations past their registration/cancellation deadline or
    start time are automatically excluded.
    """
    registrations = (
        db.query(EventRegistration)
        .options(
            joinedload(EventRegistration.event).joinedload(Event.category),
            joinedload(EventRegistration.event).joinedload(Event.organizer),
        )
        .filter(EventRegistration.user_id == current_user.user_id)
        .order_by(EventRegistration.created_at.desc())
        .all()
    )

    now = now_naive_local()
    active_registrations = [
        r for r in registrations if not _is_expired_waitlist(r, now)
    ]

    counts = _registered_counts(
        db,
        [r.event_id for r in active_registrations if r.event_id is not None],
    )

    return [
        HistoryResponse(
            registration_id=registration.registration_id,
            user_id=registration.user_id,
            event_id=registration.event_id,
            registration_status=_registration_status_name(
                registration.registration_status,
            ),
            created_at=registration.created_at,
            events=_build_event_response(
                registration.event,
                counts.get(registration.event_id, 0),
            ),
        )
        for registration in active_registrations
    ]


def cancel_registration_service(
    registration_id: UUID,
    current_user: User,
    db: Session,
) -> CancelRegistrationResponse:
    try:
        # Lấy đăng ký cùng ngày bắt đầu sự kiện, đồng thời kiểm tra quyền sở hữu.
        registration = (
            db.query(EventRegistration)
            .options(joinedload(EventRegistration.event))
            .filter(
                EventRegistration.registration_id == registration_id,
                EventRegistration.user_id == current_user.user_id,
            )
            .first()
        )

        if registration is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin đăng ký.",
            )

        start_time = (
            registration.event.start_time
            if registration.event is not None
            else None
        )

        if start_time is not None:
            # Database hiện dùng DateTime không kèm timezone; giữ quy ước UTC
            # giống với implementation Supabase ban đầu.
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            else:
                start_time = start_time.astimezone(timezone.utc)

            now = datetime.now(timezone.utc)
            if start_time - now < timedelta(days=5):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Chỉ có thể hủy đăng ký trước khi sự kiện diễn ra "
                        "ít nhất 5 ngày."
                    ),
                )

        old_status_name = _registration_status_name(registration.registration_status)
        registration.registration_status = RegistrationStatus.CANCELLED
        db.commit()
        db.refresh(registration)

        if old_status_name in ("REGISTERED", "CHECKED_IN"):
            event_title = registration.event.title if registration.event else None
            promote_next_waitlisted_participant(db, registration.event_id, event_title)

        return CancelRegistrationResponse(
            message="Registration cancelled successfully",
            data=[
                CancelledRegistrationResponse(
                    registration_id=registration.registration_id,
                    registration_status="CANCELLED",
                )
            ],
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể hủy đăng ký sự kiện.",
        ) from error
