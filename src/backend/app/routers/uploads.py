"""Endpoints upload ảnh bìa và tệp kế hoạch sự kiện."""
from fastapi import APIRouter, File, UploadFile

from app.schemas.upload import UploadOut
from ..services import storage_service

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post(
    "/banner",
    response_model=UploadOut,
    summary="Tải ảnh bìa sự kiện → bucket banner_event",
)
async def upload_banner(file: UploadFile = File(...)):
    return await storage_service.upload_banner(file)


@router.post(
    "/event-plan",
    response_model=UploadOut,
    summary="Tải tài liệu kế hoạch (PDF/Word) → bucket event_plan",
)
async def upload_event_plan(file: UploadFile = File(...)):
    return await storage_service.upload_plan(file)
