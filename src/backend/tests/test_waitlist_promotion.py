import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.models.enum import RegistrationStatus, UserRole
from app.models.event import Event
from app.models.registration import EventRegistration
from app.models.user import User
from app.services.history_services import (
    cancel_registration_service,
    promote_next_waitlisted_participant,
)


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def sample_event():
    return Event(
        event_id=uuid.uuid4(),
        title="Sự kiện Đột phá Công nghệ",
        start_time=datetime.now(timezone.utc) + timedelta(days=10),
        end_time=datetime.now(timezone.utc) + timedelta(days=10, hours=2),
    )


@pytest.fixture
def student_official():
    return User(
        user_id=uuid.uuid4(),
        email="official@university.edu.vn",
        full_name="Sinh viên Chính thức",
        role=UserRole.STUDENT,
    )


@pytest.fixture
def student_waitlisted():
    return User(
        user_id=uuid.uuid4(),
        email="waitlist@university.edu.vn",
        full_name="Sinh viên Danh sách chờ",
        role=UserRole.STUDENT,
    )


def test_promote_next_waitlisted_participant_success(
    mock_db, sample_event, student_waitlisted
):
    waitlist_reg = EventRegistration(
        registration_id=uuid.uuid4(),
        user_id=student_waitlisted.user_id,
        event_id=sample_event.event_id,
        registration_status=RegistrationStatus.WAITLISTED,
        created_at=datetime.now(timezone.utc) - timedelta(hours=2),
        event=sample_event,
    )

    query_mock = MagicMock()
    query_mock.options.return_value.filter.return_value.order_by.return_value.first.return_value = (
        waitlist_reg
    )
    mock_db.query.return_value = query_mock

    promoted = promote_next_waitlisted_participant(
        db=mock_db, event_id=sample_event.event_id, event_title=sample_event.title
    )

    assert promoted is not None
    assert promoted.registration_status == RegistrationStatus.REGISTERED
    mock_db.commit.assert_called_once()


def test_cancel_registration_triggers_waitlist_promotion(
    mock_db, sample_event, student_official, student_waitlisted
):
    official_reg = EventRegistration(
        registration_id=uuid.uuid4(),
        user_id=student_official.user_id,
        event_id=sample_event.event_id,
        registration_status=RegistrationStatus.REGISTERED,
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
        event=sample_event,
    )

    waitlist_reg = EventRegistration(
        registration_id=uuid.uuid4(),
        user_id=student_waitlisted.user_id,
        event_id=sample_event.event_id,
        registration_status=RegistrationStatus.WAITLISTED,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
        event=sample_event,
    )

    # 1. Query for official_reg in cancel_registration_service
    q1 = MagicMock()
    q1.options.return_value.filter.return_value.first.return_value = official_reg

    # 2. Query for next waitlist in promote_next_waitlisted_participant
    q2 = MagicMock()
    q2.options.return_value.filter.return_value.order_by.return_value.first.return_value = waitlist_reg

    mock_db.query.side_effect = [q1, q2]

    res = cancel_registration_service(
        registration_id=official_reg.registration_id,
        current_user=student_official,
        db=mock_db,
    )

    assert official_reg.registration_status == RegistrationStatus.CANCELLED
    assert waitlist_reg.registration_status == RegistrationStatus.REGISTERED
    assert res.data[0].registration_status == "CANCELLED"
