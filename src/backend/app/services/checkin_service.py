"""Services for event check-in via QR code scanning and manual code entry."""

import random
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.checkin_qr import EventCheckinQR
from app.models.enum import RegistrationStatus, UserRole
from app.models.event import Event
from app.models.registration import EventRegistration
from app.models.user import User
from app.schemas.checkin import (
    CheckinEventInfo,
    CheckinSuccessResponse,
    EventCheckinStatsResponse,
    ParticipantCheckinStatus,
    ParticipantInfo,
    QRDetailResponse,
)


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _format_registration_status(status_val: object | None) -> str:
    if status_val is None:
        return "REGISTERED"
    val_str = getattr(status_val, "value", str(status_val)).upper().replace("-", "_")
    if val_str == "CHECK_IN":
        return "CHECKED_IN"
    return val_str


def _generate_manual_code(db: Session) -> str:
    """Generate a unique, clean 8-character manual code (e.g. EV-8F92A1)."""
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace("O", "").replace("0", "").replace("I", "").replace("1", "")

    for _ in range(50):
        code_body = "".join(random.choices(chars, k=6))
        manual_code = f"EV-{code_body}"
        existing = (
            db.query(EventCheckinQR)
            .filter(EventCheckinQR.manual_code == manual_code)
            .first()
        )
        if not existing:
            return manual_code

    # Fallback to random hex if standard attempts collision
    return f"EV-{uuid.uuid4().hex[:6].upper()}"


def get_or_create_qr_code(db: Session, registration_id: UUID) -> EventCheckinQR:
    """Get existing QR record or generate a new one for a registration."""
    existing_qr = (
        db.query(EventCheckinQR)
        .filter(EventCheckinQR.registration_id == registration_id)
        .first()
    )
    if existing_qr:
        return existing_qr

    registration = (
        db.query(EventRegistration)
        .options(joinedload(EventRegistration.event))
        .filter(EventRegistration.registration_id == registration_id)
        .first()
    )
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin đăng ký.",
        )

    now = datetime.now(timezone.utc)
    qr_token = f"QR-{uuid.uuid4().hex}"
    manual_code = _generate_manual_code(db)

    # Determine expiration: event end_time + 2 hours buffer, or 7 days from now
    event = registration.event
    if event and event.end_time:
        end_dt = _ensure_utc(event.end_time)
        expired_at = end_dt + timedelta(hours=2)
    elif event and event.start_time:
        start_dt = _ensure_utc(event.start_time)
        expired_at = start_dt + timedelta(hours=24)
    else:
        expired_at = now + timedelta(days=7)

    qr_record = EventCheckinQR(
        registration_id=registration_id,
        qr_token=qr_token,
        manual_code=manual_code,
        created_at=now,
        expired_at=expired_at,
    )

    db.add(qr_record)
    db.commit()
    db.refresh(qr_record)
    return qr_record


def get_user_event_qr(
    db: Session,
    current_user: User,
    event_id: UUID,
) -> QRDetailResponse:
    """Retrieve or generate student's QR code for a specific event."""
    registration = (
        db.query(EventRegistration)
        .options(joinedload(EventRegistration.event))
        .filter(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.user_id,
        )
        .first()
    )

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa đăng ký tham gia sự kiện này.",
        )

    status_str = _format_registration_status(registration.registration_status)
    if status_str == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đã hủy đăng ký tham gia sự kiện này.",
        )

    qr_record = get_or_create_qr_code(db, registration.registration_id)

    return QRDetailResponse(
        registration_id=registration.registration_id,
        event_id=registration.event_id,
        event_title=registration.event.title if registration.event else None,
        qr_token=qr_record.qr_token,
        manual_code=qr_record.manual_code,
        created_at=qr_record.created_at,
        expired_at=qr_record.expired_at,
        registration_status=status_str,
        checked_in_at=registration.checked_in_at,
    )


def process_checkin(
    db: Session,
    code: str,
    current_user: User,
    event_id: Optional[UUID] = None,
) -> CheckinSuccessResponse:
    """Process event check-in via QR token or manual code with validation & safety locks."""
    clean_code = code.strip()
    if not clean_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp mã QR hoặc mã thủ công.",
        )

    # Look up QR record by matching qr_token or manual_code
    qr_record = (
        db.query(EventCheckinQR)
        .options(
            joinedload(EventCheckinQR.registration)
            .joinedload(EventRegistration.user),
            joinedload(EventCheckinQR.registration)
            .joinedload(EventRegistration.event),
        )
        .filter(
            (EventCheckinQR.qr_token == clean_code)
            | (func.upper(EventCheckinQR.manual_code) == clean_code.upper())
        )
        .first()
    )

    registration = None
    event = None
    user = None

    if qr_record and qr_record.registration:
        registration = qr_record.registration
        event = registration.event
        user = registration.user

        # Verification: Expiration check for QR/manual token
        now = datetime.now(timezone.utc)
        if qr_record.expired_at:
            exp_dt = _ensure_utc(qr_record.expired_at)
            if exp_dt and now > exp_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mã check-in đã hết hạn sử dụng.",
                )
    else:
        # Fallback: Look up registration directly by student_code (MSSV) or email
        reg_query = (
            db.query(EventRegistration)
            .options(
                joinedload(EventRegistration.user),
                joinedload(EventRegistration.event),
            )
            .join(User, EventRegistration.user_id == User.user_id)
        )

        if event_id is not None:
            reg_query = reg_query.filter(EventRegistration.event_id == event_id)

        registration = (
            reg_query.filter(
                (func.upper(User.student_code) == clean_code.upper())
                | (func.upper(User.email) == clean_code.upper())
            ).first()
        )

        if not registration or not registration.user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy đăng ký của sinh viên có mã '{clean_code}' trong hệ thống.",
            )

        event = registration.event
        user = registration.user

    # Permission check: Caller must be ORGANIZER or ADMIN
    if current_user.role not in (UserRole.ORGANIZER, UserRole.ADMIN):
        if not (event and event.organizer_id == current_user.user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thực hiện check-in cho sự kiện này.",
            )

    # Verification: Event matching check
    if event_id is not None and registration.event_id is not None:
        if str(registration.event_id) != str(event_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã vé QR không thuộc về sự kiện đang check-in này.",
            )

    # Verification: Registration status check (Cancelled)
    reg_status_str = _format_registration_status(registration.registration_status)
    if reg_status_str == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đăng ký tham gia sự kiện này của người dùng đã bị hủy.",
        )

    # Verification: Idempotency check (Already checked in)
    if reg_status_str == "CHECKED_IN":
        checked_time_str = (
            registration.checked_in_at.strftime("%H:%M:%S %d/%m/%Y")
            if registration.checked_in_at
            else "trước đó"
        )
        user_name = user.full_name or user.email if user else "Người dùng"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sinh viên {user_name} ({user.student_code or user.email}) đã được check-in trước đó vào lúc {checked_time_str}.",
        )

    # Execution: Lock & update registration status atomically
    locked_reg = (
        db.query(EventRegistration)
        .filter(EventRegistration.registration_id == registration.registration_id)
        .with_for_update()
        .first()
    )

    if not locked_reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không thể khóa bản ghi đăng ký để check-in.",
        )

    checkin_time = datetime.now(timezone.utc)
    locked_reg.registration_status = RegistrationStatus.CHECKED_IN
    locked_reg.checked_in_at = checkin_time
    db.commit()
    db.refresh(locked_reg)

    participant_info = ParticipantInfo(
        user_id=user.user_id,
        full_name=user.full_name,
        email=user.email,
        student_code=user.student_code,
        contact_phone=user.contact_phone,
        avatar_url=user.avatar_url,
    )

    event_info = CheckinEventInfo(
        event_id=event.event_id if event else registration.event_id,
        title=event.title if event else "Sự kiện",
        start_time=event.start_time if event else None,
        end_time=event.end_time if event else None,
        location=event.location if event else None,
    )

    return CheckinSuccessResponse(
        success=True,
        message=f"Check-in thành công cho {user.full_name or user.email}!",
        participant=participant_info,
        event=event_info,
        checked_in_at=checkin_time,
        registration_status="CHECKED_IN",
    )


def get_event_checkin_stats(
    db: Session,
    event_id: UUID,
    current_user: User,
) -> EventCheckinStatsResponse:
    """Get check-in statistics and participant list for event organizers."""
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sự kiện.",
        )

    if current_user.role not in (UserRole.ORGANIZER, UserRole.ADMIN):
        if event.organizer_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem thông tin điểm danh sự kiện này.",
            )

    registrations = (
        db.query(EventRegistration)
        .options(joinedload(EventRegistration.user))
        .filter(
            EventRegistration.event_id == event_id,
            EventRegistration.registration_status != RegistrationStatus.CANCELLED,
        )
        .order_by(EventRegistration.created_at.desc())
        .all()
    )

    total_registered = len(registrations)
    total_checked_in = sum(
        1
        for r in registrations
        if _format_registration_status(r.registration_status) == "CHECKED_IN"
    )

    participants = [
        ParticipantCheckinStatus(
            registration_id=r.registration_id,
            user_id=r.user_id,
            full_name=r.user.full_name if r.user else None,
            email=r.user.email if r.user else "",
            student_code=r.user.student_code if r.user else None,
            registration_status=_format_registration_status(r.registration_status),
            checked_in_at=r.checked_in_at,
            created_at=r.created_at or datetime.now(timezone.utc),  # <-- Fallback ở đây
        )
        for r in registrations
    ]

    return EventCheckinStatsResponse(
        event_id=event.event_id,
        title=event.title,
        capacity=event.capacity,
        total_registered=total_registered,
        total_checked_in=total_checked_in,
        participants=participants,
    )
