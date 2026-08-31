from fastapi import APIRouter, Depends, Query

from app.core.auth import require_student
from app.models.user import User
from app.schemas.recommendation import RecommendationListOut
from app.services import recommendation_service


router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("", response_model=RecommendationListOut)
def list_recommendations(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_student),
) -> RecommendationListOut:
    return recommendation_service.get_recommendations(
        str(current_user.user_id),
        limit=limit,
    )

