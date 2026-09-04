from unittest.mock import patch
from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.models.enum import UserRole, UserStatus
from app.routers.recommendations import router


STUDENT_ID = "11111111-1111-1111-1111-111111111111"


class _User:
    user_id = UUID(STUDENT_ID)
    role = UserRole.STUDENT
    status = UserStatus.ACTIVE


class _Organizer:
    user_id = UUID("22222222-2222-2222-2222-222222222222")
    role = UserRole.ORGANIZER
    status = UserStatus.ACTIVE


def _client(authenticated: bool = True) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: _User()
    return TestClient(app)


def test_recommendations_require_authentication():
    response = _client(authenticated=False).get("/api/recommendations")

    assert response.status_code == 401


def test_recommendations_reject_non_student_account():
    client = _client(authenticated=False)
    client.app.dependency_overrides[get_current_user] = lambda: _Organizer()

    response = client.get("/api/recommendations")

    assert response.status_code == 403


@patch("app.routers.recommendations.recommendation_service.get_recommendations")
def test_recommendations_use_current_user_and_limit(mock_get_recommendations):
    mock_get_recommendations.return_value = {
        "items": [],
        "algorithm": "popular_fallback",
        "personalized": False,
    }

    response = _client().get("/api/recommendations?limit=5")

    assert response.status_code == 200
    assert response.json()["items"] == []
    mock_get_recommendations.assert_called_once_with(STUDENT_ID, limit=5)


def test_recommendations_reject_limit_above_fifty():
    response = _client().get("/api/recommendations?limit=51")

    assert response.status_code == 422

