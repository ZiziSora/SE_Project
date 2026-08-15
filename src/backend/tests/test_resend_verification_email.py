from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models.enum import UserRole, UserStatus
from app.schemas.auth import ResendVerificationRequest
from app.services import auth_services


def _mock_pending_organizer(db):
    user = SimpleNamespace(
        email="organizer@example.com",
        role=UserRole.ORGANIZER,
        status=UserStatus.PENDING,
    )
    db.query.return_value.filter.return_value.first.return_value = user
    return user


def test_resend_verification_email_sends_signup_email(mocker):
    auth_services._verification_resend_attempts.clear()
    db = mocker.Mock()
    _mock_pending_organizer(db)
    resend = mocker.patch.object(auth_services.supabase.auth, "resend")

    response = auth_services.resend_verification_email(
        ResendVerificationRequest(email="ORGANIZER@example.com"),
        db,
    )

    resend.assert_called_once()
    credentials = resend.call_args.args[0]
    assert credentials["type"] == "signup"
    assert credentials["email"] == "organizer@example.com"
    assert credentials["options"]["email_redirect_to"].startswith(
        f"{auth_services.FRONTEND_URL}/auth/callback?verification_state="
    )
    assert response.retry_after_seconds == 60
    assert response.verification_state


def test_resend_verification_email_enforces_cooldown(mocker):
    auth_services._verification_resend_attempts.clear()
    db = mocker.Mock()
    _mock_pending_organizer(db)
    mocker.patch.object(auth_services.supabase.auth, "resend")
    request = ResendVerificationRequest(email="organizer@example.com")

    auth_services.resend_verification_email(request, db)

    with pytest.raises(HTTPException) as exc_info:
        auth_services.resend_verification_email(request, db)

    assert exc_info.value.status_code == 429
    assert int(exc_info.value.headers["Retry-After"]) > 0
