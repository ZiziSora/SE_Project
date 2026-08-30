from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.enum import OrganizerRequestStatus, UserRole, UserStatus
from app.schemas.auth import OrganizerResubmitRequest
from app.services import auth_services


def _rejected_organizer():
    return SimpleNamespace(
        user_id=uuid4(),
        email="organizer@university.edu",
        full_name="CLB Học thuật",
        department_name="Công nghệ Thông tin",
        role=UserRole.ORGANIZER,
        status=UserStatus.REJECTED,
    )


def test_resubmit_creates_linked_request_without_creating_auth_user(monkeypatch):
    user = _rejected_organizer()
    previous_request = SimpleNamespace(
        request_id=uuid4(),
        user_id=user.user_id,
        status=OrganizerRequestStatus.REJECTED,
        reason="Tổ chức các hoạt động học thuật.",
        rejected_reason="Thiếu minh chứng.",
    )
    latest_query = MagicMock()
    latest_query.filter.return_value.order_by.return_value.with_for_update.return_value.first.return_value = (
        previous_request
    )
    user_query = MagicMock()
    user_query.filter.return_value.with_for_update.return_value.first.return_value = user
    db = MagicMock()
    db.query.side_effect = [user_query, latest_query]
    monkeypatch.setattr(
        auth_services,
        "upload_organizer_proofs",
        lambda _user_id, _proofs: ([], []),
    )
    sign_up = MagicMock()
    monkeypatch.setattr(auth_services.supabase.auth, "sign_up", sign_up)

    result = auth_services.resubmit_organizer_request(
        data=OrganizerResubmitRequest(
            full_name="CLB Học thuật mới",
            department_name="Toán - Tin học",
            reason="Hồ sơ đã bổ sung đầy đủ.",
        ),
        current_user=user,
        db=db,
    )

    added_request = next(
        call.args[0]
        for call in db.add.call_args_list
        if call.args[0].__class__.__name__ == "OrganizerRequest"
    )
    assert added_request.previous_request_id == previous_request.request_id
    assert added_request.status == OrganizerRequestStatus.PENDING
    assert previous_request.status == OrganizerRequestStatus.REJECTED
    assert previous_request.reason == "Tổ chức các hoạt động học thuật."
    assert previous_request.rejected_reason == "Thiếu minh chứng."
    assert user.status == UserStatus.PENDING
    assert user.full_name == "CLB Học thuật mới"
    assert result["status"] == OrganizerRequestStatus.PENDING
    sign_up.assert_not_called()


def test_resubmit_requires_latest_request_to_be_rejected():
    user = _rejected_organizer()
    pending_request = SimpleNamespace(
        request_id=uuid4(),
        status=OrganizerRequestStatus.PENDING,
    )
    latest_query = MagicMock()
    latest_query.filter.return_value.order_by.return_value.with_for_update.return_value.first.return_value = (
        pending_request
    )
    user_query = MagicMock()
    user_query.filter.return_value.with_for_update.return_value.first.return_value = user
    db = MagicMock()
    db.query.side_effect = [user_query, latest_query]

    with pytest.raises(HTTPException) as error:
        auth_services.resubmit_organizer_request(
            data=OrganizerResubmitRequest(
                full_name="CLB Học thuật",
                reason="Bổ sung hồ sơ.",
            ),
            current_user=user,
            db=db,
        )

    assert error.value.status_code == 409
