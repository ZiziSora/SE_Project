import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.checkin_qr import EventCheckinQR
from app.models.enum import RegistrationStatus, UserRole
from app.models.event import Event
from app.models.registration import EventRegistration
from app.models.user import User
from app.services.checkin_service import (
    get_or_create_qr_code,
    get_user_event_qr,
    process_checkin,
)


@pytest.fixture
def mock_db():
    db = MagicMock()
    return db


@pytest.fixture
def sample_organizer():
    return User(
        user_id=uuid.uuid4(),
        email="organizer@university.edu.vn",
        full_name="Ban Tổ Chức",
        role=UserRole.ORGANIZER,
    )


@pytest.fixture
def sample_student():
    return User(
        user_id=uuid.uuid4(),
        email="student@university.edu.vn",
        full_name="Nguyễn Văn A",
        student_code="20120001",
        contact_phone="0912345678",
        role=UserRole.STUDENT,
    )


@pytest.fixture
def sample_event(sample_organizer):
    return Event(
        event_id=uuid.uuid4(),
        organizer_id=sample_organizer.user_id,
        title="Hội thảo Khoa học Sinh viên 2026",
        start_time=datetime.now(timezone.utc) - timedelta(hours=1),
        end_time=datetime.now(timezone.utc) + timedelta(hours=3),
        location="Hội trường A",
    )


@pytest.fixture
def sample_registration(sample_student, sample_event):
    return EventRegistration(
        registration_id=uuid.uuid4(),
        user_id=sample_student.user_id,
        event_id=sample_event.event_id,
        registration_status=RegistrationStatus.REGISTERED,
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
        user=sample_student,
        event=sample_event,
    )


@pytest.fixture
def sample_qr(sample_registration):
    return EventCheckinQR(
        registration_id=sample_registration.registration_id,
        qr_token="QR-abc123def456",
        manual_code="EV-8F92A1",
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
        expired_at=datetime.now(timezone.utc) + timedelta(hours=5),
        registration=sample_registration,
    )


def test_get_or_create_qr_code_existing(mock_db, sample_qr):
    mock_db.query.return_value.filter.return_value.first.return_value = sample_qr

    qr = get_or_create_qr_code(mock_db, sample_qr.registration_id)

    assert qr == sample_qr
    assert qr.qr_token == "QR-abc123def456"
    assert qr.manual_code == "EV-8F92A1"


def test_process_checkin_success(
    mock_db, sample_organizer, sample_registration, sample_qr
):
    # Setup db mock query returns sample_qr
    mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = (
        sample_qr
    )
    # Row locking query mock
    mock_db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = (
        sample_registration
    )

    response = process_checkin(
        db=mock_db,
        code="QR-abc123def456",
        current_user=sample_organizer,
        event_id=sample_registration.event_id,
    )

    assert response.success is True
    assert response.participant.full_name == "Nguyễn Văn A"
    assert response.participant.student_code == "20120001"
    assert response.registration_status == "CHECKED_IN"
    assert sample_registration.registration_status == RegistrationStatus.CHECKED_IN
    assert sample_registration.checked_in_at is not None
    mock_db.commit.assert_called_once()


def test_process_checkin_manual_code_success(
    mock_db, sample_organizer, sample_registration, sample_qr
):
    mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = (
        sample_qr
    )
    mock_db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = (
        sample_registration
    )

    response = process_checkin(
        db=mock_db,
        code="ev-8f92a1",  # Test case insensitivity
        current_user=sample_organizer,
        event_id=sample_registration.event_id,
    )

    assert response.success is True
    assert response.participant.email == "student@university.edu.vn"


def test_process_checkin_by_student_code_success(
    mock_db, sample_organizer, sample_registration
):
    # First query (EventCheckinQR lookup) returns None
    # Second query (EventRegistration lookup by MSSV) returns sample_registration
    mock_query = MagicMock()
    mock_db.query.return_value = mock_query

    # Configure query chain for QR lookup returning None, then reg lookup returning sample_registration
    qr_lookup = MagicMock()
    qr_lookup.options.return_value.filter.return_value.first.return_value = None

    reg_lookup = MagicMock()
    reg_lookup.options.return_value.join.return_value.filter.return_value.filter.return_value.first.return_value = (
        sample_registration
    )

    mock_db.query.side_effect = [qr_lookup, reg_lookup, mock_query]
    mock_query.filter.return_value.with_for_update.return_value.first.return_value = (
        sample_registration
    )

    response = process_checkin(
        db=mock_db,
        code="20120001",
        current_user=sample_organizer,
        event_id=sample_registration.event_id,
    )

    assert response.success is True
    assert response.participant.student_code == "20120001"
    assert response.registration_status == "CHECKED_IN"
    assert sample_registration.registration_status == RegistrationStatus.CHECKED_IN
    assert sample_registration.checked_in_at is not None


def test_process_checkin_not_found(mock_db, sample_organizer):
    mock_query = MagicMock()
    mock_db.query.return_value = mock_query
    mock_query.options.return_value.filter.return_value.first.return_value = None
    mock_query.options.return_value.join.return_value.filter.return_value.first.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        process_checkin(
            db=mock_db,
            code="INVALID_CODE",
            current_user=sample_organizer,
        )

    assert exc_info.value.status_code == 404
    assert "Không tìm thấy" in exc_info.value.detail


def test_process_checkin_expired(
    mock_db, sample_organizer, sample_registration, sample_qr
):
    sample_qr.expired_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = (
        sample_qr
    )

    with pytest.raises(HTTPException) as exc_info:
        process_checkin(
            db=mock_db,
            code="QR-abc123def456",
            current_user=sample_organizer,
        )

    assert exc_info.value.status_code == 400
    assert "đã hết hạn sử dụng" in exc_info.value.detail


def test_process_checkin_wrong_event(
    mock_db, sample_organizer, sample_registration, sample_qr
):
    sample_qr.registration.event_id = sample_registration.event_id
    mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = (
        sample_qr
    )
    different_event_id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        process_checkin(
            db=mock_db,
            code="QR-abc123def456",
            current_user=sample_organizer,
            event_id=different_event_id,
        )

    assert exc_info.value.status_code == 400
    assert "không thuộc về sự kiện" in exc_info.value.detail


def test_process_checkin_already_checked_in(
    mock_db, sample_organizer, sample_registration, sample_qr
):
    sample_registration.registration_status = RegistrationStatus.CHECKED_IN
    sample_registration.checked_in_at = datetime.now(timezone.utc) - timedelta(
        minutes=15
    )
    mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = (
        sample_qr
    )

    with pytest.raises(HTTPException) as exc_info:
        process_checkin(
            db=mock_db,
            code="QR-abc123def456",
            current_user=sample_organizer,
        )

    assert exc_info.value.status_code == 409
    assert "đã được check-in trước đó" in exc_info.value.detail


def test_get_user_event_qr_waitlisted_forbidden(mock_db, sample_student, sample_registration):
    sample_registration.registration_status = RegistrationStatus.WAITLISTED
    mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = (
        sample_registration
    )

    with pytest.raises(HTTPException) as exc_info:
        get_user_event_qr(
            db=mock_db,
            current_user=sample_student,
            event_id=sample_registration.event_id,
        )

    assert exc_info.value.status_code == 403
    assert "danh sách chờ" in exc_info.value.detail


def test_get_user_event_qr_success(mock_db, sample_student, sample_registration, sample_qr):
    sample_registration.registration_status = RegistrationStatus.REGISTERED
    mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = (
        sample_registration
    )

    with patch("app.services.checkin_service.get_or_create_qr_code", return_value=sample_qr):
        res = get_user_event_qr(
            db=mock_db,
            current_user=sample_student,
            event_id=sample_registration.event_id,
        )

    assert res.registration_id == sample_registration.registration_id
    assert res.qr_token == sample_qr.qr_token


