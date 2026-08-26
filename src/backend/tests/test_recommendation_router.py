from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.routers.recommendations import router


STUDENT_ID = "11111111-1111-1111-1111-111111111111"


class _User:
    id = STUDENT_ID


def _client(authenticated: bool = True) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: _User()
    return TestClient(app)


def test_recommendations_require_authentication():
    response = _client(authenticated=False).get("/api/recommendations")

    assert response.status_code == 401


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

