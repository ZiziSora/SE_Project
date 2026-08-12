from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.enum import UserRole, UserStatus
from app.schemas.auth import LoginRequest
from app.services import auth_services


def _auth_response(user_id, *, email_confirmed=True):
    return SimpleNamespace(
        session=SimpleNamespace(
            access_token="access-token",
            refresh_token="refresh-token",
        ),
        user=SimpleNamespace(
            id=user_id,
            email="organizer@university.edu",
            email_confirmed_at="2026-08-12T08:00:00Z" if email_confirmed else None,
        ),
    )


def _db_with_user(user):
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = user
    return db


def test_login_rejects_pending_organizer(monkeypatch):
    user_id = uuid4()
    db_user = SimpleNamespace(
        user_id=user_id,
        role=UserRole.ORGANIZER,
        status=UserStatus.PENDING,
    )
    db = _db_with_user(db_user)
    monkeypatch.setattr(
        auth_services.supabase.auth,
        "sign_in_with_password",
        lambda _credentials: _auth_response(user_id),
    )

    with pytest.raises(HTTPException) as error:
        auth_services.login_service(
            LoginRequest(
                email="organizer@university.edu",
                password="secret123",
            ),
            db,
        )

    assert error.value.status_code == 403
    assert "chờ quản trị viên phê duyệt" in error.value.detail


def test_login_allows_approved_organizer(monkeypatch):
    user_id = uuid4()
    db_user = SimpleNamespace(
        user_id=user_id,
        role=UserRole.ORGANIZER,
        status=UserStatus.ACTIVE,
    )
    db = _db_with_user(db_user)
    monkeypatch.setattr(
        auth_services.supabase.auth,
        "sign_in_with_password",
        lambda _credentials: _auth_response(user_id),
    )

    result = auth_services.login_service(
        LoginRequest(
            email="organizer@university.edu",
            password="secret123",
        ),
        db,
    )

    assert result.status == "active"
    assert result.can_manage_events is True


def test_verify_email_reports_already_approved_organizer(monkeypatch):
    user_id = uuid4()
    auth_user = _auth_response(user_id).user
    db_user = SimpleNamespace(
        user_id=user_id,
        role=UserRole.ORGANIZER,
        status=UserStatus.ACTIVE,
    )
    db = _db_with_user(db_user)
    monkeypatch.setattr(
        auth_services.supabase.auth,
        "get_user",
        lambda _token: SimpleNamespace(user=auth_user),
    )

    result = auth_services.verify_email(
        SimpleNamespace(credentials="access-token"),
        db,
    )

    assert "đã được phê duyệt" in result.message
    assert "đang chờ" not in result.message
    assert result.role == "organizer"
    assert result.status == "active"


def test_verification_state_round_trip():
    state = auth_services.create_verification_state(
        "Organizer@University.edu",
        UserRole.ORGANIZER,
    )

    payload = auth_services.decode_verification_state(state)

    assert payload["email"] == "organizer@university.edu"
    assert payload["role"] == "organizer"


def test_verification_status_recovers_consumed_email_link(monkeypatch):
    user_id = uuid4()
    db_user = SimpleNamespace(
        user_id=user_id,
        email="organizer@university.edu",
        role=UserRole.ORGANIZER,
        status=UserStatus.PENDING,
    )
    db = _db_with_user(db_user)
    auth_user = _auth_response(user_id).user
    monkeypatch.setattr(
        auth_services.supabase_admin.auth.admin,
        "get_user_by_id",
        lambda _user_id: SimpleNamespace(user=auth_user),
    )
    state = auth_services.create_verification_state(
        db_user.email,
        UserRole.ORGANIZER,
    )

    result = auth_services.get_email_verification_status(
        auth_services.VerificationStatusRequest(
            verification_state=state,
        ),
        db,
    )

    assert result.role == "organizer"
    assert result.status == "pending"
    assert "đang chờ" in result.message
