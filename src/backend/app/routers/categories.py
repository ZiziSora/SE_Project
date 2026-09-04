"""Endpoint danh mục sự kiện."""
from fastapi import APIRouter

from app.schemas.category import CategoryOut
from ..services import event_service

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut], summary="Danh sách danh mục")
def list_categories():
    return event_service.list_categories()
