from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from app.services import recommendation_service as svc


STUDENT_ID = "11111111-1111-1111-1111-111111111111"
SIMILAR_STUDENT_ID = "22222222-2222-2222-2222-222222222222"
OTHER_STUDENT_ID = "33333333-3333-3333-3333-333333333333"


def test_build_interactions_uses_strongest_implicit_signal():
    registrations = [
        {
            "user_id": STUDENT_ID,
            "event_id": "event-a",
            "registration_status": "CHECKED_IN",
        },
        {
            "user_id": STUDENT_ID,
            "event_id": "event-cancelled",
            "registration_status": "CANCELLED",
        },
    ]
    saved_events = [
        {"student_id": STUDENT_ID, "event_id": "event-a"},
        {"student_id": STUDENT_ID, "event_id": "event-b"},
    ]

    interactions = svc.build_interactions(registrations, saved_events)

    assert interactions == [
        {"user_id": STUDENT_ID, "event_id": "event-a", "weight": 5.0},
        {"user_id": STUDENT_ID, "event_id": "event-b", "weight": 1.0},
    ]


def test_rank_collaborative_events_prefers_events_from_more_similar_users():
    interactions = [
        {"user_id": STUDENT_ID, "event_id": "event-a", "weight": 5.0},
        {"user_id": STUDENT_ID, "event_id": "event-b", "weight": 3.0},
        {
            "user_id": SIMILAR_STUDENT_ID,
            "event_id": "event-a",
            "weight": 5.0,
        },
        {
            "user_id": SIMILAR_STUDENT_ID,
            "event_id": "event-c",
            "weight": 5.0,
        },
        {
            "user_id": OTHER_STUDENT_ID,
            "event_id": "event-b",
            "weight": 5.0,
        },
        {
            "user_id": OTHER_STUDENT_ID,
            "event_id": "event-d",
            "weight": 5.0,
        },
    ]

    ranked = svc.rank_collaborative_events(
        student_id=STUDENT_ID,
        interactions=interactions,
        candidate_event_ids={"event-a", "event-b", "event-c", "event-d"},
        limit=10,
    )

    assert [item["event_id"] for item in ranked] == ["event-c", "event-d"]
    assert all(0.0 <= item["score"] <= 1.0 for item in ranked)


def test_rank_collaborative_events_returns_empty_for_cold_start_user():
    ranked = svc.rank_collaborative_events(
        student_id=STUDENT_ID,
        interactions=[
            {
                "user_id": SIMILAR_STUDENT_ID,
                "event_id": "event-a",
                "weight": 5.0,
            }
        ],
        candidate_event_ids={"event-a"},
        limit=10,
    )

    assert ranked == []


@patch.object(svc, "_sklearn_cosine_similarity")
def test_rank_collaborative_events_uses_scikit_learn_cosine(mock_cosine):
    mock_cosine.return_value = [[1.0, 0.8]]
    interactions = [
        {"user_id": STUDENT_ID, "event_id": "event-a", "weight": 5.0},
        {
            "user_id": SIMILAR_STUDENT_ID,
            "event_id": "event-a",
            "weight": 5.0,
        },
        {
            "user_id": SIMILAR_STUDENT_ID,
            "event_id": "event-b",
            "weight": 3.0,
        },
    ]

    ranked = svc.rank_collaborative_events(
        student_id=STUDENT_ID,
        interactions=interactions,
        candidate_event_ids={"event-a", "event-b"},
    )

    assert ranked[0]["event_id"] == "event-b"
    mock_cosine.assert_called_once()


def test_eligible_events_excludes_started_expired_and_full_events():
    now = datetime(2026, 8, 26, 10, 0, tzinfo=timezone.utc)
    events = [
        {
            "event_id": "eligible",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
            "start_time": (now + timedelta(days=2)).isoformat(),
            "registration_deadline": (now + timedelta(days=1)).isoformat(),
            "capacity": 10,
        },
        {
            "event_id": "started",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
            "start_time": (now - timedelta(hours=1)).isoformat(),
            "capacity": 10,
        },
        {
            "event_id": "expired",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
            "start_time": (now + timedelta(days=2)).isoformat(),
            "registration_deadline": (now - timedelta(minutes=1)).isoformat(),
            "capacity": 10,
        },
        {
            "event_id": "full",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
            "start_time": (now + timedelta(days=2)).isoformat(),
            "capacity": 1,
        },
    ]

    eligible = svc._eligible_events(events, {"full": 1}, now=now)

    assert [event["event_id"] for event in eligible] == ["eligible"]


@patch("app.services.recommendation_service._score_content_documents")
def test_rank_content_events_prefers_similar_event_text(mock_score_documents):
    mock_score_documents.return_value = [1.0, 0.15, 0.82]
    interactions = [
        {
            "user_id": STUDENT_ID,
            "event_id": "event-history",
            "weight": 5.0,
        }
    ]
    events = [
        {
            "event_id": "event-history",
            "title": "Workshop Python",
            "description": "Lập trình API và xử lý dữ liệu",
            "category_id": 1,
            "location": "Phòng máy",
        },
        {
            "event_id": "event-tech",
            "title": "Cuộc thi AI",
            "description": "Phát triển ứng dụng trí tuệ nhân tạo",
            "category_id": 1,
            "location": "Phòng máy",
        },
        {
            "event_id": "event-sport",
            "title": "Giải bóng đá",
            "description": "Thi đấu thể thao sinh viên",
            "category_id": 2,
            "location": "Sân vận động",
        },
    ]

    ranked = svc.rank_content_events(
        student_id=STUDENT_ID,
        interactions=interactions,
        events=events,
        category_names={1: "Công nghệ", 2: "Thể thao"},
        candidate_event_ids={"event-tech", "event-sport"},
    )

    assert [item["event_id"] for item in ranked] == [
        "event-tech",
        "event-sport",
    ]
    documents = mock_score_documents.call_args.args[0]
    assert "Workshop Python" in documents[0]
    assert "Công nghệ" in documents[0]


@patch.object(svc, "_sklearn_cosine_similarity")
@patch.object(svc, "_TfidfVectorizer")
def test_score_content_documents_uses_tfidf_and_cosine(
    mock_vectorizer_class,
    mock_cosine,
):
    event_matrix = MagicMock()
    profile = MagicMock()
    event_matrix.__getitem__.return_value = profile
    profile.__mul__.return_value = profile
    profile.__truediv__.return_value = profile
    mock_vectorizer_class.return_value.fit_transform.return_value = event_matrix
    mock_cosine.return_value.ravel.return_value = [1.0, 0.7]

    scores = svc._score_content_documents(
        ["Workshop Python", "Cuộc thi AI"],
        [(0, 5.0)],
    )

    assert scores == [1.0, 0.7]
    mock_vectorizer_class.assert_called_once_with(
        lowercase=True,
        ngram_range=(1, 2),
        min_df=1,
        max_features=10_000,
        sublinear_tf=True,
    )
    mock_cosine.assert_called_once_with(profile, event_matrix)


@patch("app.services.recommendation_service._fetch_category_names")
@patch("app.services.recommendation_service._fetch_event_catalog")
@patch("app.services.recommendation_service._fetch_saved_rows")
@patch("app.services.recommendation_service._fetch_registration_rows")
def test_get_recommendations_uses_popularity_for_cold_start(
    mock_registrations,
    mock_saved,
    mock_catalog,
    mock_categories,
):
    now = datetime.now(timezone.utc)
    mock_registrations.return_value = [
        {
            "user_id": SIMILAR_STUDENT_ID,
            "event_id": "event-popular",
            "registration_status": "REGISTERED",
        }
    ]
    mock_saved.return_value = []
    mock_catalog.return_value = [
        {
            "event_id": "event-new",
            "title": "Sự kiện mới",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
            "start_time": (now + timedelta(days=3)).isoformat(),
            "registration_deadline": (now + timedelta(days=2)).isoformat(),
            "capacity": 50,
            "category_id": 1,
        },
        {
            "event_id": "event-popular",
            "title": "Sự kiện phổ biến",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
            "start_time": (now + timedelta(days=4)).isoformat(),
            "registration_deadline": (now + timedelta(days=2)).isoformat(),
            "capacity": 50,
            "category_id": 1,
        },
    ]
    mock_categories.return_value = {1: "Học thuật"}

    result = svc.get_recommendations(STUDENT_ID, limit=10)

    assert result["algorithm"] == "popular_fallback"
    assert result["personalized"] is False
    assert result["items"][0]["event_id"] == "event-popular"
    assert result["items"][0]["category_name"] == "Học thuật"


@patch("app.services.recommendation_service._fetch_category_names")
@patch("app.services.recommendation_service._fetch_event_catalog")
@patch("app.services.recommendation_service._fetch_saved_rows")
@patch("app.services.recommendation_service._fetch_registration_rows")
@patch("app.services.recommendation_service.rank_content_events")
def test_get_recommendations_returns_personalized_collaborative_result(
    mock_content_rank,
    mock_registrations,
    mock_saved,
    mock_catalog,
    mock_categories,
):
    now = datetime.now(timezone.utc)
    mock_registrations.return_value = [
        {
            "user_id": STUDENT_ID,
            "event_id": "event-history",
            "registration_status": "CHECKED_IN",
        },
        {
            "user_id": SIMILAR_STUDENT_ID,
            "event_id": "event-history",
            "registration_status": "CHECKED_IN",
        },
        {
            "user_id": SIMILAR_STUDENT_ID,
            "event_id": "event-recommended",
            "registration_status": "REGISTERED",
        },
    ]
    mock_saved.return_value = []
    mock_catalog.return_value = [
        {
            "event_id": "event-recommended",
            "title": "Workshop dữ liệu",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
            "start_time": (now + timedelta(days=3)).isoformat(),
            "registration_deadline": (now + timedelta(days=2)).isoformat(),
            "capacity": 50,
            "category_id": 1,
        }
    ]
    mock_categories.return_value = {1: "Học thuật"}
    mock_content_rank.return_value = [
        {"event_id": "event-recommended", "score": 0.8}
    ]

    result = svc.get_recommendations(STUDENT_ID, limit=10)

    assert result["algorithm"] == "hybrid"
    assert result["personalized"] is True
    assert result["items"][0]["event_id"] == "event-recommended"
    assert result["items"][0]["recommendation_score"] > 0


@patch("app.services.recommendation_service._fetch_category_names")
@patch("app.services.recommendation_service._fetch_event_catalog")
@patch("app.services.recommendation_service._fetch_saved_rows")
@patch("app.services.recommendation_service._fetch_registration_rows")
@patch("app.services.recommendation_service.rank_content_events")
def test_get_recommendations_uses_content_when_no_similar_users(
    mock_content_rank,
    mock_registrations,
    mock_saved,
    mock_catalog,
    mock_categories,
):
    now = datetime.now(timezone.utc)
    mock_registrations.return_value = [
        {
            "user_id": STUDENT_ID,
            "event_id": "event-history",
            "registration_status": "CHECKED_IN",
        }
    ]
    mock_saved.return_value = []
    mock_catalog.return_value = [
        {
            "event_id": "event-content",
            "title": "Workshop AI",
            "event_status": "PUBLISHED",
            "approval_status": "APPROVED",
            "start_time": (now + timedelta(days=3)).isoformat(),
            "registration_deadline": (now + timedelta(days=2)).isoformat(),
            "capacity": 50,
            "category_id": 1,
        }
    ]
    mock_categories.return_value = {1: "Học thuật"}
    mock_content_rank.return_value = [
        {"event_id": "event-content", "score": 0.75}
    ]

    result = svc.get_recommendations(STUDENT_ID, limit=10)

    assert result["algorithm"] == "content_based_tfidf"
    assert result["personalized"] is True
    assert result["items"][0]["event_id"] == "event-content"
