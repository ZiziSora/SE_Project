import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.enum import RegistrationStatus, UserRole, UserStatus
from app.models.event import Event
from app.models.registration import EventRegistration
from app.models.user import User
from app.services.checkin_service import manual_checkin_participant


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def sample_organizer():
    return User(
        user_id=uuid.uuid4(),
        email="organizer@university.edu.vn",
        full_name="Ban Tổ Chức",
        role=UserRole.ORGANIZER,
        status=UserStatus.ACTIVE,
    )


@pytest.fixture
def unauthorized_user():
    return User(
        user_id=uuid.uuid4(),
        email="other@university.edu.vn",
        full_name="Sinh Vien B",
        role=UserRole.STUDENT,
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
        title="Hội thảo AI 2026",
        start_time=datetime.now(timezone.utc) - timedelta(hours=1),
        end_time=datetime.now(timezone.utc) + timedelta(hours=3),
        location="Hội trường B",
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


def test_manual_checkin_success_by_registration_id(
    mock_db, sample_organizer, sample_event, sample_registration
):
    event_query = MagicMock()
    event_query.filter.return_value.first.return_value = sample_event

    reg_query = MagicMock()
    reg_query.options.return_value.filter.return_value.filter.return_value.first.return_value = (
        sample_registration
    )

    lock_query = MagicMock()
    lock_query.filter.return_value.with_for_update.return_value.first.return_value = (
        sample_registration
    )

    mock_db.query.side_effect = [event_query, reg_query, lock_query]

    response = manual_checkin_participant(
        db=mock_db,
        event_id=sample_event.event_id,
        current_user=sample_organizer,
        registration_id=sample_registration.registration_id,
    )

    assert response.success is True
    assert response.participant.student_code == "20120001"
    assert response.registration_status == "CHECKED_IN"
    assert sample_registration.registration_status == RegistrationStatus.CHECKED_IN
    assert sample_registration.checked_in_at is not None
    mock_db.commit.assert_called_once()


def test_manual_checkin_unauthorized(
    mock_db, unauthorized_user, sample_event
):
    event_query = MagicMock()
    event_query.filter.return_value.first.return_value = sample_event
    mock_db.query.return_value = event_query

    with pytest.raises(HTTPException) as exc_info:
        manual_checkin_participant(
            db=mock_db,
            event_id=sample_event.event_id,
            current_user=unauthorized_user,
            student_code="20120001",
        )

    assert exc_info.value.status_code == 403
    assert "không có quyền" in exc_info.value.detail


def test_manual_checkin_not_found(mock_db, sample_organizer, sample_event):
    event_query = MagicMock()
    event_query.filter.return_value.first.return_value = sample_event

    reg_query = MagicMock()
    reg_query.options.return_value.filter.return_value.filter.return_value.first.return_value = None
    reg_query.options.return_value.filter.return_value.join.return_value.filter.return_value.first.return_value = None

    mock_db.query.side_effect = [event_query, reg_query, reg_query]

    with pytest.raises(HTTPException) as exc_info:
        manual_checkin_participant(
            db=mock_db,
            event_id=sample_event.event_id,
            current_user=sample_organizer,
            student_code="99999999",
        )

    assert exc_info.value.status_code == 404
    assert "Không tìm thấy" in exc_info.value.detail


def test_manual_checkin_already_checked_in(
    mock_db, sample_organizer, sample_event, sample_registration
):
    sample_registration.registration_status = RegistrationStatus.CHECKED_IN
    sample_registration.checked_in_at = datetime.now(timezone.utc) - timedelta(minutes=30)

    event_query = MagicMock()
    event_query.filter.return_value.first.return_value = sample_event

    reg_query = MagicMock()
    reg_query.options.return_value.filter.return_value.filter.return_value.first.return_value = (
        sample_registration
    )

    mock_db.query.side_effect = [event_query, reg_query]

    with pytest.raises(HTTPException) as exc_info:
        manual_checkin_participant(
            db=mock_db,
            event_id=sample_event.event_id,
            current_user=sample_organizer,
            registration_id=sample_registration.registration_id,
        )

    assert exc_info.value.status_code == 409
    assert "đã được check-in trước đó" in exc_info.value.detail


def test_manual_checkin_waitlisted_rejected(
    mock_db, sample_organizer, sample_event, sample_registration
):
    sample_registration.registration_status = RegistrationStatus.WAITLISTED

    event_query = MagicMock()
    event_query.filter.return_value.first.return_value = sample_event

    reg_query = MagicMock()
    reg_query.options.return_value.filter.return_value.filter.return_value.first.return_value = (
        sample_registration
    )

    mock_db.query.side_effect = [event_query, reg_query]

    with pytest.raises(HTTPException) as exc_info:
        manual_checkin_participant(
            db=mock_db,
            event_id=sample_event.event_id,
            current_user=sample_organizer,
            registration_id=sample_registration.registration_id,
        )

    assert exc_info.value.status_code == 400
    assert "danh sách chờ" in exc_info.value.detail
