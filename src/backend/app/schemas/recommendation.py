from pydantic import BaseModel, Field

from app.schemas.event import EventOut


class RecommendedEventOut(EventOut):
    recommendation_score: float = Field(ge=0.0, le=1.0)
    recommendation_reason: str


class RecommendationListOut(BaseModel):
    items: list[RecommendedEventOut]
    algorithm: str
    personalized: bool

