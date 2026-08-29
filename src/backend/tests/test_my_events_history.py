import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.models.enum import RegistrationStatus, UserRole
from app.models.event import Event
from app.models.registration import EventRegistration
from app.models.user import User
from app.services.history_services import get_event_history_service


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def sample_student():
    return User(
        user_id=uuid.uuid4(),
        email="student_waitlist@university.edu.vn",
        full_name="Sinh viên Danh sách chờ",
        role=UserRole.STUDENT,
    )


@pytest.fixture
def sample_event():
    return Event(
        event_id=uuid.uuid4(),
        title="Hội thảo sinh viên 2026",
        start_time=datetime.now(timezone.utc) + timedelta(days=7),
        end_time=datetime.now(timezone.utc) + timedelta(days=7, hours=2),
    )


def test_get_event_history_with_waitlisted_status(mock_db, sample_student, sample_event):
    reg = EventRegistration(
        registration_id=uuid.uuid4(),
        user_id=sample_student.user_id,
        event_id=sample_event.event_id,
        registration_status=RegistrationStatus.WAITLISTED,
        created_at=datetime.now(timezone.utc),
        event=sample_event,
    )

    query_mock = MagicMock()
    query_mock.options.return_value.filter.return_value.order_by.return_value.all.return_value = [reg]
    mock_db.query.return_value = query_mock

    history = get_event_history_service(db=mock_db, current_user=sample_student)

    assert len(history) == 1
    assert history[0].registration_status == "WAITLISTED"
    assert history[0].registration_id == reg.registration_id
