from fastapi import APIRouter, Depends, Query
from supabase_auth.types import User

from app.core.security import require_current_user
from app.schemas.recommendation import RecommendationListOut
from app.services import recommendation_service


router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("", response_model=RecommendationListOut)
def list_recommendations(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_current_user),
) -> RecommendationListOut:
    return recommendation_service.get_recommendations(
        str(current_user.id),
        limit=limit,
    )

