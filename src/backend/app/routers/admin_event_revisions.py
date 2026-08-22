"""Admin xét duyệt YÊU CẦU CHỈNH SỬA sự kiện đã công khai.

Khác với `/api/admin/review-events` (duyệt sự kiện MỚI lần đầu): ở đây sự kiện
đã chạy rồi, Ban tổ chức chỉ xin đổi vài trường. Mỗi bản ghi kèm sẵn bảng so
sánh `changes` gồm `old_text` → `new_text` để giao diện gạch bỏ giá trị cũ.
"""

from fastapi import APIRouter, Depends

from app.core.auth import require_admin
from app.models.user import User
from app.schemas.event_revision import (
    EventRevisionListOut,
    RevisionDecisionOut,
)
from app.services import event_revision_service

router = APIRouter(
    prefix="/api/admin/review-event-changes",
    tags=["Admin review event changes"],
)


@router.get(
    "",
    response_model=EventRevisionListOut,
    summary="Danh sách yêu cầu chỉnh sửa đang chờ duyệt",
)
def list_pending_revisions(_current_admin: User = Depends(require_admin)):
    items = event_revision_service.list_pending_for_admin()
    return {"items": items, "total": len(items)}


@router.patch(
    "/{revision_id}/accept",
    response_model=RevisionDecisionOut,
    summary="Chấp nhận thay đổi (áp dụng dữ liệu mới vào sự kiện)",
)
def accept_revision(
    revision_id: str,
    _current_admin: User = Depends(require_admin),
):
    revision = event_revision_service.approve_revision(revision_id)
    return {"message": "Đã áp dụng thay đổi cho sự kiện.", "revision": revision}


@router.patch(
    "/{revision_id}/reject",
    response_model=RevisionDecisionOut,
    summary="Từ chối thay đổi (sự kiện giữ nguyên bản đang chạy)",
)
def reject_revision(
    revision_id: str,
    _current_admin: User = Depends(require_admin),
):
    revision = event_revision_service.reject_revision(revision_id)
    return {
        "message": "Đã từ chối thay đổi. Sự kiện giữ nguyên nội dung cũ.",
        "revision": revision,
    }
