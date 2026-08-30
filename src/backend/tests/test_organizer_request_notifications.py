from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest

from app.models.enum import (
    NotificationType,
    OrganizerRequestStatus,
    UserStatus,
)
from app.services.organizer_request_service import review_organizer_request


REQUEST_ID = UUID("11111111-1111-1111-1111-111111111111")
ORGANIZER_ID = UUID("22222222-2222-2222-2222-222222222222")
ADMIN_ID = UUID("33333333-3333-3333-3333-333333333333")


@pytest.mark.parametrize(
    ("decision", "user_status", "notification_type", "title"),
    [
        (
            OrganizerRequestStatus.APPROVED,
            UserStatus.ACTIVE,
            NotificationType.ORGANIZER_REQUEST_APPROVED,
            "Yêu cầu Ban tổ chức đã được duyệt",
        ),
        (
            OrganizerRequestStatus.REJECTED,
            UserStatus.REJECTED,
            NotificationType.ORGANIZER_REQUEST_REJECTED,
            "Yêu cầu Ban tổ chức đã bị từ chối",
        ),
    ],
)
@patch("app.services.organizer_request_service.get_organizer_request")
@patch(
    "app.services.organizer_request_service.notification_service.create_notification"
)
def test_review_organizer_request_notifies_applicant(
    mock_create_notification,
    mock_get_request,
    decision,
    user_status,
    notification_type,
    title,
):
    request = SimpleNamespace(
        request_id=REQUEST_ID,
        user_id=ORGANIZER_ID,
        status=OrganizerRequestStatus.PENDING,
        reviewed_by=None,
    )
    user = SimpleNamespace(user_id=ORGANIZER_ID, status=UserStatus.PENDING)
    request_query = MagicMock()
    request_query.filter.return_value = request_query
    request_query.with_for_update.return_value = request_query
    request_query.first.return_value = request
    user_query = MagicMock()
    user_query.filter.return_value = user_query
    user_query.first.return_value = user
    db = MagicMock()
    db.query.side_effect = [request_query, user_query]
    mock_get_request.return_value = {"request_id": str(REQUEST_ID)}

    review_organizer_request(
        db=db,
        request_id=REQUEST_ID,
        decision=decision,
        admin_id=ADMIN_ID,
    )

    assert user.status == user_status
    db.commit.assert_called_once_with()
    mock_create_notification.assert_called_once()
    payload = mock_create_notification.call_args.kwargs
    assert payload["user_id"] == str(ORGANIZER_ID)
    assert payload["event_id"] is None
    assert payload["notification_type"] == notification_type
    assert payload["title"] == title
