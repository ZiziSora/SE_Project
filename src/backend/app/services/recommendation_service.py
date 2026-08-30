"""Hybrid collaborative and TF-IDF recommendation for event discovery."""

from __future__ import annotations

from datetime import datetime, timezone
from math import sqrt
from typing import Any, Iterable, Optional

try:
    from sklearn.feature_extraction.text import (
        TfidfVectorizer as _TfidfVectorizer,
    )
    from sklearn.metrics.pairwise import (
        cosine_similarity as _sklearn_cosine_similarity,
    )
except ImportError:  # pragma: no cover - production installs requirements.txt
    _TfidfVectorizer = None
    _sklearn_cosine_similarity = None


TABLE_EVENTS = "events"
TABLE_CATEGORIES = "event_categories"
TABLE_REGISTRATIONS = "event_registrations"
TABLE_SAVED_EVENTS = "saved_events"
TABLE_USERS = "users"


SAVED_WEIGHT = 1.0
REGISTERED_WEIGHT = 3.0
CHECKED_IN_WEIGHT = 5.0
MAX_INTERACTION_WEIGHT = CHECKED_IN_WEIGHT

COLLABORATIVE_WEIGHT = 0.6
CONTENT_WEIGHT = 0.3
POPULARITY_WEIGHT = 0.1

ACTIVE_REGISTRATION_STATUSES = {"REGISTERED", "CHECKED_IN", "CHECK_IN"}
REGISTRATION_WEIGHTS = {
    "REGISTERED": REGISTERED_WEIGHT,
    "CHECKED_IN": CHECKED_IN_WEIGHT,
    "CHECK_IN": CHECKED_IN_WEIGHT,
}

EVENT_OUTPUT_FIELDS = {
    "event_id",
    "title",
    "description",
    "location",
    "start_time",
    "end_time",
    "registration_deadline",
    "capacity",
    "event_status",
    "approval_status",
    "banner_url",
    "category_name",
}


def build_interactions(
    registration_rows: Iterable[dict[str, Any]],
    saved_rows: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Convert registrations and bookmarks to one implicit score per user/event."""
    strongest: dict[tuple[str, str], float] = {}

    for row in saved_rows:
        user_id = row.get("student_id")
        event_id = row.get("event_id")
        if not user_id or not event_id:
            continue
        key = (str(user_id), str(event_id))
        strongest[key] = max(strongest.get(key, 0.0), SAVED_WEIGHT)

    for row in registration_rows:
        user_id = row.get("user_id")
        event_id = row.get("event_id")
        status = _normalize_status(row.get("registration_status"))
        weight = REGISTRATION_WEIGHTS.get(status)
        if not user_id or not event_id or weight is None:
            continue
        key = (str(user_id), str(event_id))
        strongest[key] = max(strongest.get(key, 0.0), weight)

    return [
        {"user_id": user_id, "event_id": event_id, "weight": weight}
        for (user_id, event_id), weight in sorted(strongest.items())
    ]


def rank_collaborative_events(
    *,
    student_id: str,
    interactions: Iterable[dict[str, Any]],
    candidate_event_ids: set[str],
    limit: int = 10,
    neighbor_count: int = 20,
    excluded_event_ids: Optional[set[str]] = None,
) -> list[dict[str, Any]]:
    """Rank unseen candidates using positively similar users' interactions."""
    rows = list(interactions)
    target_id = str(student_id)
    if not rows or limit <= 0:
        return []

    user_ids = sorted({str(row["user_id"]) for row in rows})
    event_ids = sorted({str(row["event_id"]) for row in rows})
    if target_id not in user_ids:
        return []

    user_positions = {user_id: index for index, user_id in enumerate(user_ids)}
    event_positions = {
        event_id: index for index, event_id in enumerate(event_ids)
    }
    matrix = [
        [0.0 for _event_id in event_ids]
        for _user_id in user_ids
    ]

    for row in rows:
        user_index = user_positions[str(row["user_id"])]
        event_index = event_positions[str(row["event_id"])]
        matrix[user_index][event_index] = max(
            matrix[user_index][event_index],
            float(row["weight"]),
        )

    target_index = user_positions[target_id]
    if not any(matrix[target_index]):
        return []

    similarities = _cosine_similarities(matrix[target_index], matrix)
    similarities[target_index] = 0.0

    neighbor_indexes = sorted(
        (
            index
            for index, similarity in enumerate(similarities)
            if similarity > 0
        ),
        key=lambda index: (-similarities[index], user_ids[index]),
    )[:neighbor_count]
    if not neighbor_indexes:
        return []

    denominator = sum(abs(similarities[index]) for index in neighbor_indexes)
    if denominator == 0:
        return []

    normalized_scores = [0.0 for _event_id in event_ids]
    for event_index in range(len(event_ids)):
        weighted_sum = sum(
            similarities[index] * matrix[index][event_index]
            for index in neighbor_indexes
        )
        raw_score = weighted_sum / denominator
        normalized_scores[event_index] = min(
            max(raw_score / MAX_INTERACTION_WEIGHT, 0.0),
            1.0,
        )

    excluded = {str(event_id) for event_id in (excluded_event_ids or set())}
    excluded.update(
        event_ids[index]
        for index, value in enumerate(matrix[target_index])
        if value > 0
    )
    candidates = {str(event_id) for event_id in candidate_event_ids}

    ranked = [
        {
            "event_id": event_id,
            "score": float(normalized_scores[event_positions[event_id]]),
        }
        for event_id in candidates
        if event_id in event_positions
        and event_id not in excluded
        and normalized_scores[event_positions[event_id]] > 0
    ]
    ranked.sort(key=lambda item: (-item["score"], item["event_id"]))
    return ranked[:limit]


def rank_content_events(
    *,
    student_id: str,
    interactions: Iterable[dict[str, Any]],
    events: Iterable[dict[str, Any]],
    category_names: dict[int, str],
    candidate_event_ids: set[str],
    limit: int = 10,
    excluded_event_ids: Optional[set[str]] = None,
) -> list[dict[str, Any]]:
    """Rank candidates by TF-IDF similarity to a student's event history."""
    event_list = sorted(
        (event for event in events if event.get("event_id")),
        key=lambda event: str(event["event_id"]),
    )
    if not event_list or limit <= 0:
        return []

    event_positions = {
        str(event["event_id"]): index
        for index, event in enumerate(event_list)
    }
    target_weights: dict[str, float] = {}
    for row in interactions:
        if str(row.get("user_id")) != str(student_id):
            continue
        event_id = str(row.get("event_id") or "")
        if event_id not in event_positions:
            continue
        target_weights[event_id] = max(
            target_weights.get(event_id, 0.0),
            float(row.get("weight") or 0.0),
        )
    if not target_weights:
        return []

    documents = [
        _build_event_document(event, category_names)
        for event in event_list
    ]
    profile_rows = [
        (event_positions[event_id], weight)
        for event_id, weight in sorted(target_weights.items())
        if weight > 0
    ]
    scores = _score_content_documents(documents, profile_rows)
    if len(scores) != len(event_list):
        return []

    excluded = {str(event_id) for event_id in (excluded_event_ids or set())}
    excluded.update(target_weights)
    candidates = {str(event_id) for event_id in candidate_event_ids}
    ranked = [
        {
            "event_id": event_id,
            "score": min(max(float(scores[position]), 0.0), 1.0),
        }
        for event_id, position in event_positions.items()
        if event_id in candidates
        and event_id not in excluded
        and scores[position] > 0
    ]
    ranked.sort(key=lambda item: (-item["score"], item["event_id"]))
    return ranked[:limit]


def get_recommendations(
    student_id: str,
    *,
    limit: int = 10,
) -> dict[str, Any]:
    """Return hybrid recommendations, with popularity as cold-start fallback."""
    registration_rows = _fetch_registration_rows()
    saved_rows = _fetch_saved_rows()
    category_names = _fetch_category_names()
    active_counts = _active_registration_counts(registration_rows)
    event_catalog = _fetch_event_catalog()
    candidate_events = _eligible_events(
        event_catalog,
        active_counts,
    )

    target_exclusions = _target_event_ids(
        str(student_id),
        registration_rows,
        saved_rows,
    )
    candidate_events = [
        event
        for event in candidate_events
        if str(event.get("event_id")) not in target_exclusions
    ]
    event_by_id = {
        str(event["event_id"]): event
        for event in candidate_events
        if event.get("event_id")
    }
    ranking_limit = max(len(event_by_id), limit)

    interactions = build_interactions(registration_rows, saved_rows)
    collaborative = rank_collaborative_events(
        student_id=str(student_id),
        interactions=interactions,
        candidate_event_ids=set(event_by_id),
        excluded_event_ids=target_exclusions,
        limit=ranking_limit,
    )
    content_based = rank_content_events(
        student_id=str(student_id),
        interactions=interactions,
        events=event_catalog,
        category_names=category_names,
        candidate_event_ids=set(event_by_id),
        excluded_event_ids=target_exclusions,
        limit=ranking_limit,
    )
    popular = _rank_by_popularity(
        event_by_id.values(),
        active_counts,
    )
    items, algorithm = _combine_rankings(
        event_by_id=event_by_id,
        category_names=category_names,
        collaborative=collaborative,
        content_based=content_based,
        popular=popular,
        limit=limit,
    )
    personalized = bool(collaborative or content_based)
    return {
        "items": items,
        "algorithm": algorithm,
        "personalized": personalized,
    }


def _fetch_registration_rows() -> list[dict[str, Any]]:
    response = (
        get_supabase()
        .table(TABLE_REGISTRATIONS)
        .select("user_id,event_id,registration_status,created_at")
        .execute()
    )
    return list(response.data or [])


def _fetch_saved_rows() -> list[dict[str, Any]]:
    response = (
        get_supabase()
        .table(TABLE_SAVED_EVENTS)
        .select("student_id,event_id,saved_at")
        .execute()
    )
    return list(response.data or [])


def _fetch_event_catalog() -> list[dict[str, Any]]:
    response = (
        get_supabase()
        .table(TABLE_EVENTS)
        .select("*")
        .eq("approval_status", "APPROVED")
        .execute()
    )
    return list(response.data or [])


def _fetch_category_names() -> dict[int, str]:
    response = (
        get_supabase()
        .table(TABLE_CATEGORIES)
        .select("category_id,name")
        .execute()
    )
    return {
        int(row["category_id"]): str(row["name"])
        for row in (response.data or [])
        if row.get("category_id") is not None and row.get("name")
    }


def _eligible_events(
    events: Iterable[dict[str, Any]],
    active_counts: dict[str, int],
    *,
    now: Optional[datetime] = None,
) -> list[dict[str, Any]]:
    current_time = now or datetime.now(timezone.utc)
    eligible: list[dict[str, Any]] = []

    for event in events:
        event_id = event.get("event_id")
        if not event_id:
            continue
        if str(event.get("event_status") or "").upper() != "PUBLISHED":
            continue
        if str(event.get("approval_status") or "").upper() != "APPROVED":
            continue

        start_time = _parse_datetime(event.get("start_time"))
        deadline = _parse_datetime(event.get("registration_deadline"))
        if start_time is None or start_time <= current_time:
            continue
        if deadline is not None and deadline < current_time:
            continue

        capacity = event.get("capacity")
        try:
            is_full = capacity is not None and (
                active_counts.get(str(event_id), 0) >= int(capacity)
            )
        except (TypeError, ValueError):
            is_full = False
        if is_full:
            continue

        eligible.append(dict(event))

    return eligible


def _active_registration_counts(
    registration_rows: Iterable[dict[str, Any]],
) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in registration_rows:
        event_id = row.get("event_id")
        status = _normalize_status(row.get("registration_status"))
        if event_id and status in ACTIVE_REGISTRATION_STATUSES:
            key = str(event_id)
            counts[key] = counts.get(key, 0) + 1
    return counts


def _target_event_ids(
    student_id: str,
    registration_rows: Iterable[dict[str, Any]],
    saved_rows: Iterable[dict[str, Any]],
) -> set[str]:
    event_ids = {
        str(row["event_id"])
        for row in registration_rows
        if str(row.get("user_id")) == student_id and row.get("event_id")
    }
    event_ids.update(
        str(row["event_id"])
        for row in saved_rows
        if str(row.get("student_id")) == student_id and row.get("event_id")
    )
    return event_ids


def _rank_by_popularity(
    events: Iterable[dict[str, Any]],
    active_counts: dict[str, int],
) -> list[dict[str, Any]]:
    event_list = list(events)
    maximum = max(
        (active_counts.get(str(event.get("event_id")), 0) for event in event_list),
        default=0,
    )
    ranked = [
        {
            "event": event,
            "score": (
                active_counts.get(str(event.get("event_id")), 0) / maximum
                if maximum > 0
                else 0.0
            ),
        }
        for event in event_list
    ]
    ranked.sort(
        key=lambda item: (
            -active_counts.get(str(item["event"].get("event_id")), 0),
            _parse_datetime(item["event"].get("start_time"))
            or datetime.max.replace(tzinfo=timezone.utc),
            str(item["event"].get("event_id")),
        )
    )
    return ranked


def _combine_rankings(
    *,
    event_by_id: dict[str, dict[str, Any]],
    category_names: dict[int, str],
    collaborative: Iterable[dict[str, Any]],
    content_based: Iterable[dict[str, Any]],
    popular: Iterable[dict[str, Any]],
    limit: int,
) -> tuple[list[dict[str, Any]], str]:
    collaborative_scores = {
        str(item["event_id"]): float(item["score"])
        for item in collaborative
    }
    content_scores = {
        str(item["event_id"]): float(item["score"])
        for item in content_based
    }
    popularity_scores = {
        str(item["event"]["event_id"]): float(item["score"])
        for item in popular
    }

    has_collaborative = bool(collaborative_scores)
    has_content = bool(content_scores)
    if has_collaborative and has_content:
        algorithm = "hybrid"
        weights = (
            COLLABORATIVE_WEIGHT,
            CONTENT_WEIGHT,
            POPULARITY_WEIGHT,
        )
    elif has_content:
        algorithm = "content_based_tfidf"
        weights = (0.0, 0.9, 0.1)
    elif has_collaborative:
        algorithm = "user_based_collaborative"
        weights = (0.9, 0.0, 0.1)
    else:
        algorithm = "popular_fallback"
        weights = (0.0, 0.0, 1.0)

    collaborative_weight, content_weight, popularity_weight = weights
    scored: list[dict[str, Any]] = []
    for event_id, event in event_by_id.items():
        collaborative_score = collaborative_scores.get(event_id, 0.0)
        content_score = content_scores.get(event_id, 0.0)
        popularity_score = popularity_scores.get(event_id, 0.0)
        score = (
            collaborative_weight * collaborative_score
            + content_weight * content_score
            + popularity_weight * popularity_score
        )
        scored.append(
            {
                "event": event,
                "event_id": event_id,
                "score": min(max(score, 0.0), 1.0),
                "reason": _recommendation_reason(
                    collaborative_score=collaborative_score,
                    content_score=content_score,
                ),
            }
        )

    scored.sort(
        key=lambda item: (
            -item["score"],
            _parse_datetime(item["event"].get("start_time"))
            or datetime.max.replace(tzinfo=timezone.utc),
            item["event_id"],
        )
    )
    items = [
        _to_recommended_event(
            item["event"],
            category_names,
            score=item["score"],
            reason=item["reason"],
        )
        for item in scored[:limit]
    ]
    return items, algorithm


def _recommendation_reason(
    *,
    collaborative_score: float,
    content_score: float,
) -> str:
    if collaborative_score > 0 and content_score > 0:
        return (
            "Phù hợp với lịch sử của bạn và được sinh viên có sở thích "
            "tương tự quan tâm."
        )
    if content_score > 0:
        return "Có nội dung tương tự những sự kiện bạn từng quan tâm."
    if collaborative_score > 0:
        return "Sinh viên có sở thích tương tự cũng quan tâm sự kiện này."
    return "Sự kiện sắp diễn ra đang được nhiều sinh viên quan tâm."


def _to_recommended_event(
    event: dict[str, Any],
    category_names: dict[int, str],
    *,
    score: float,
    reason: str,
) -> dict[str, Any]:
    data = {
        field: event.get(field)
        for field in EVENT_OUTPUT_FIELDS
        if field != "category_name"
    }
    category_id = event.get("category_id")
    data["event_id"] = str(event["event_id"])
    data["category_name"] = event.get("category_name") or (
        category_names.get(int(category_id))
        if category_id is not None
        else None
    )
    data["recommendation_score"] = round(float(score), 6)
    data["recommendation_reason"] = reason
    return data


def _normalize_status(value: Any) -> str:
    raw = getattr(value, "value", value)
    return str(raw or "").strip().upper().replace("-", "_").replace(" ", "_")


def _build_event_document(
    event: dict[str, Any],
    category_names: dict[int, str],
) -> str:
    category_id = event.get("category_id")
    category_name = event.get("category_name") or (
        category_names.get(int(category_id))
        if category_id is not None
        else ""
    )
    parts = [
        event.get("title") or "",
        event.get("title") or "",
        event.get("description") or "",
        category_name or "",
        category_name or "",
        event.get("location") or "",
    ]
    return " ".join(str(part).strip() for part in parts if str(part).strip())


def _score_content_documents(
    documents: list[str],
    profile_rows: list[tuple[int, float]],
) -> list[float]:
    if _TfidfVectorizer is None or _sklearn_cosine_similarity is None:
        return []
    if not documents or not profile_rows:
        return []

    vectorizer = _TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        min_df=1,
        max_features=10_000,
        sublinear_tf=True,
    )
    try:
        event_matrix = vectorizer.fit_transform(documents)
    except ValueError:
        return []

    profile = None
    total_weight = 0.0
    for row_index, weight in profile_rows:
        if weight <= 0:
            continue
        weighted_row = event_matrix[row_index] * float(weight)
        profile = weighted_row if profile is None else profile + weighted_row
        total_weight += float(weight)
    if profile is None or total_weight == 0:
        return []

    profile = profile / total_weight
    similarities = _sklearn_cosine_similarity(profile, event_matrix).ravel()
    return [float(value) for value in similarities]


def _cosine_similarities(
    target: list[float],
    matrix: list[list[float]],
) -> list[float]:
    if _sklearn_cosine_similarity is not None:
        result = _sklearn_cosine_similarity([target], matrix)
        return [float(value) for value in result[0]]

    target_norm = sqrt(sum(value * value for value in target))
    if target_norm == 0:
        return [0.0 for _row in matrix]

    similarities: list[float] = []
    for row in matrix:
        row_norm = sqrt(sum(value * value for value in row))
        if row_norm == 0:
            similarities.append(0.0)
            continue
        dot_product = sum(
            target_value * row_value
            for target_value, row_value in zip(target, row)
        )
        similarities.append(dot_product / (target_norm * row_norm))
    return similarities


def get_supabase():
    """Import lazily so pure recommendation tests do not need live SDK setup."""
    from app.core.supabase_client import get_supabase as get_client

    return get_client()


def _parse_datetime(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except (TypeError, ValueError):
            return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)

def _fetch_student_signals(student_id: str) -> dict[str, Any]:
    """Lịch sử đăng ký + sự kiện đã lưu của sinh viên, dùng để tính độ liên quan."""
    supabase = get_supabase()

    registrations_res = (
        supabase.table(TABLE_REGISTRATIONS)
        .select("event_id, registration_status, events(category_id)")
        .eq("user_id", student_id)
        .execute()
    )
    saved_res = (
        supabase.table(TABLE_SAVED_EVENTS)
        .select("event_id, events(category_id)")
        .eq("student_id", student_id)
        .execute()
    )
    user_res = (
        supabase.table(TABLE_USERS)
        .select("department_name")
        .eq("user_id", student_id)
        .maybe_single()
        .execute()
    )

    category_weight: dict[int, float] = {}
    engaged_event_ids: set[str] = set()

    for row in registrations_res.data or []:
        eid = row.get("event_id")
        if eid:
            engaged_event_ids.add(eid)
        if (row.get("registration_status") or "").upper() == "CANCELLED":
            continue
        cat_id = (row.get("events") or {}).get("category_id")
        if cat_id is not None:
            category_weight[cat_id] = category_weight.get(cat_id, 0) + 2

    for row in saved_res.data or []:
        eid = row.get("event_id")
        if eid:
            engaged_event_ids.add(eid)
        cat_id = (row.get("events") or {}).get("category_id")
        if cat_id is not None:
            category_weight[cat_id] = category_weight.get(cat_id, 0) + 1

    department_name = (user_res.data or {}).get("department_name") if user_res.data else None

    return {
        "category_weight": category_weight,
        "engaged_event_ids": engaged_event_ids,
        "department_name": department_name,
    }


def _score_events(
    events: list[dict[str, Any]],
    *,
    signals: Optional[dict[str, Any]],
    registered_counts: dict[str, int],
    organizer_departments: dict[str, Optional[str]],
) -> list[tuple[float, dict[str, Any]]]:
    max_registered = max(registered_counts.values(), default=0) or 1
    category_weight = (signals or {}).get("category_weight", {})
    department_name = (signals or {}).get("department_name")

    scored: list[tuple[float, dict[str, Any]]] = []
    for event in events:
        # Tín hiệu "đang hot" luôn có mặt — kể cả khi chưa có gì để cá nhân hoá.
        score = registered_counts.get(event.get("event_id"), 0) / max_registered

        cat_id = event.get("category_id")
        if cat_id is not None and cat_id in category_weight:
            score += category_weight[cat_id] * 3

        if department_name:
            organizer_dept = organizer_departments.get(event.get("organizer_id"))
            if organizer_dept and organizer_dept.strip().lower() == department_name.strip().lower():
                score += 2

        scored.append((score, event))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return scored


def _to_recommended_out(
    event: dict[str, Any],
    categories: dict[int, str],
    reason: str,
) -> RecommendedEventOut:
    data = dict(event)
    data["category_name"] = categories.get(event.get("category_id"))
    return RecommendedEventOut(reason=reason, **data)


class _LlmPick(BaseModel):
    event_id: str
    reason: str


class _LlmRecommendations(BaseModel):
    picks: list[_LlmPick]


def _build_llm_prompt(
    shortlist: list[dict[str, Any]],
    categories: dict[int, str],
    signals: dict[str, Any],
    limit: int,
) -> str:
    top_categories = sorted(
        signals.get("category_weight", {}).items(), key=lambda kv: kv[1], reverse=True
    )
    top_category_names = [categories.get(cat_id, str(cat_id)) for cat_id, _ in top_categories[:3]]

    profile_lines = [
        f"- Khoa/đơn vị: {signals.get('department_name') or 'không rõ'}",
        "- Danh mục sự kiện sinh viên quan tâm (dựa trên lịch sử đăng ký/lưu): "
        + (", ".join(top_category_names) if top_category_names else "chưa có dữ liệu"),
    ]

    event_lines = []
    for event in shortlist:
        start = event.get("start_time") or "chưa rõ thời gian"
        description = (event.get("description") or "").strip().replace("\n", " ")[:200]
        event_lines.append(
            f'- event_id={event["event_id"]} | title="{event.get("title")}" | '
            f'category={categories.get(event.get("category_id"), "khác")} | '
            f'start_time={start} | mô tả="{description}"'
        )

    return (
        "Hồ sơ sinh viên:\n"
        + "\n".join(profile_lines)
        + "\n\nDanh sách sự kiện ứng viên:\n"
        + "\n".join(event_lines)
        + f"\n\nHãy chọn tối đa {limit} sự kiện phù hợp nhất với sinh viên này, "
        "xếp theo mức độ liên quan giảm dần. Với mỗi sự kiện, viết 1 câu lý do "
        "ngắn gọn bằng tiếng Việt, cá nhân hoá theo hồ sơ và lịch sử ở trên "
        "(ví dụ nhắc tới danh mục hoặc khoa liên quan). Chỉ chọn event_id có "
        "trong danh sách ứng viên, không tự bịa thêm."
    )


def _rerank_with_llm(
    shortlist: list[dict[str, Any]],
    categories: dict[int, str],
    signals: dict[str, Any],
    limit: int,
) -> Optional[list[_LlmPick]]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        import importlib

        genai = importlib.import_module("google.genai")
    except Exception:
        logger.warning("Thư viện google-genai chưa được cài, bỏ qua bước gợi ý bằng AI.")
        return None

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    prompt = _build_llm_prompt(shortlist, categories, signals, limit)

    try:
        client = genai.Client(api_key=api_key)
        interaction = client.interactions.create(
            model=model,
            system_instruction=(
                "Bạn là trợ lý gợi ý sự kiện cho một hệ sinh thái sự kiện đại học. "
                "Trả lời ngắn gọn, chỉ dùng thông tin được cung cấp, không bịa thêm sự kiện."
            ),
            input=prompt,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": _LlmRecommendations.model_json_schema(),
            },
        )
        parsed = _LlmRecommendations.model_validate_json(interaction.output_text)
        return parsed.picks
    except Exception:  # noqa: BLE001
        logger.exception("Gọi Gemini API để gợi ý sự kiện thất bại, dùng kết quả rule-based.")
        return None


def get_recommendations_service(
    student_id: Optional[str],
    limit: int = 6,
) -> RecommendationsOut:
    events = _fetch_candidate_events()
    categories = _category_map()

    signals = _fetch_student_signals(student_id) if student_id else None
    engaged_ids = (signals or {}).get("engaged_event_ids", set())
    candidates = [e for e in events if e.get("event_id") not in engaged_ids]

    event_ids = [e["event_id"] for e in candidates if e.get("event_id")]
    organizer_ids = list({e.get("organizer_id") for e in candidates if e.get("organizer_id")})
    registered_counts = _fetch_registration_counts(event_ids)
    organizer_departments = _fetch_organizer_departments(organizer_ids)

    scored = _score_events(
        candidates,
        signals=signals,
        registered_counts=registered_counts,
        organizer_departments=organizer_departments,
    )

    has_personalization_signal = bool((signals or {}).get("category_weight"))
    shortlist = [event for _, event in scored[:SHORTLIST_SIZE]]

    llm_picks = (
        _rerank_with_llm(shortlist, categories, signals, limit)
        if signals and has_personalization_signal
        else None
    )

    if llm_picks:
        shortlist_by_id = {e["event_id"]: e for e in shortlist}
        recommendations = [
            _to_recommended_out(shortlist_by_id[pick.event_id], categories, pick.reason)
            for pick in llm_picks
            if pick.event_id in shortlist_by_id
        ][:limit]
        if recommendations:
            return RecommendationsOut(personalized=True, recommendations=recommendations)

    fallback_reason = (
        "Phù hợp với lịch sử tham gia của bạn"
        if has_personalization_signal
        else "Sự kiện đang được quan tâm nhiều"
    )
    recommendations = [
        _to_recommended_out(event, categories, fallback_reason) for _, event in scored[:limit]
    ]
    return RecommendationsOut(
        personalized=has_personalization_signal,
        recommendations=recommendations,
    )
