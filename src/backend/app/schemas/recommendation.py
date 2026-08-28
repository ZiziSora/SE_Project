from pydantic import BaseModel

from app.schemas.event import EventOut


class RecommendedEventOut(EventOut):
    reason: str


class RecommendationsOut(BaseModel):
    personalized: bool
    recommendations: list[RecommendedEventOut]
