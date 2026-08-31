from collections import defaultdict
import logging
from math import ceil
from pathlib import PurePosixPath
from urllib.parse import unquote, urlparse
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.enum import NotificationType, OrganizerRequestStatus, UserStatus
from app.models.organization_type import OrganizationType
from app.models.organizer_request import OrganizerRequest
from app.models.organizer_request_attachment import OrganizerRequestAttachment
from app.models.user import User
from app.services import notification_service


logger = logging.getLogger(__name__)


def _request_query(db: Session):
    return (
        db.query(OrganizerRequest, User, OrganizationType)
        .join(User, User.user_id == OrganizerRequest.user_id)
        .outerjoin(
            OrganizationType,
            OrganizationType.organization_type_id == User.organization_type_id,
        )
    )


def _attachment_file_name(url: str) -> str:
    path_name = PurePosixPath(urlparse(url).path).name
    return unquote(path_name) or "Tài liệu minh chứng"


def _attachments_by_request(
    db: Session,
    request_ids: list[UUID],
) -> dict[UUID, list[dict]]:
    grouped_attachments = defaultdict(list)
    if not request_ids:
        return grouped_attachments

    attachments = (
        db.query(OrganizerRequestAttachment)
        .filter(OrganizerRequestAttachment.request_id.in_(request_ids))
        .all()
    )
    for attachment in attachments:
        grouped_attachments[attachment.request_id].append(
            {
                "attachment_id": attachment.attachment_id,
                "url": attachment.url,
                "file_name": _attachment_file_name(attachment.url),
            }
        )

    return grouped_attachments


def _serialize_request(
    request: OrganizerRequest,
    user: User,
    organization_type: OrganizationType | None,
    attachments: list[dict],
) -> dict:
    return {
        "request_id": request.request_id,
        "previous_request_id": request.previous_request_id,
        "user_id": user.user_id,
        "full_name": user.full_name or user.email,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "department_name": user.department_name,
        "organization_type": (
            organization_type.name if organization_type else None
        ),
        "reason": request.reason,
        "rejected_reason": request.rejected_reason,
        "status": request.status,
        "submitted_at": request.create_at,
        "reviewed_by": request.reviewed_by,
        "attachments": attachments,
    }


def _request_summary(db: Session) -> dict:
    counts = {
        "pending": 0,
        "approved": 0,
        "rejected": 0,
    }
    rows = (
        db.query(OrganizerRequest.status, func.count(OrganizerRequest.request_id))
        .group_by(OrganizerRequest.status)
        .all()
    )
    for request_status, count in rows:
        status_value = (
            request_status.value
            if isinstance(request_status, OrganizerRequestStatus)
            else str(request_status)
        )
        if status_value in counts:
            counts[status_value] = count

    return {
        "total": sum(counts.values()),
        **counts,
    }


def list_organizer_requests(
    db: Session,
    page: int,
    page_size: int,
    search: str | None,
    status_filter: OrganizerRequestStatus | None,
) -> dict:
    query = _request_query(db)

    normalized_search = (search or "").strip()
    if normalized_search:
        pattern = f"%{normalized_search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(pattern),
                User.email.ilike(pattern),
                User.department_name.ilike(pattern),
                OrganizationType.name.ilike(pattern),
                OrganizerRequest.reason.ilike(pattern),
            )
        )

    if status_filter is not None:
        query = query.filter(OrganizerRequest.status == status_filter)

    total = query.count()
    rows = (
        query.order_by(
            OrganizerRequest.create_at.desc(),
            OrganizerRequest.request_id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    request_ids = [request.request_id for request, _user, _type in rows]
    attachments = _attachments_by_request(db, request_ids)

    return {
        "items": [
            _serialize_request(
                request=request,
                user=user,
                organization_type=organization_type,
                attachments=attachments[request.request_id],
            )
            for request, user, organization_type in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total else 0,
        "summary": _request_summary(db),
    }


def get_organizer_request(db: Session, request_id: UUID) -> dict:
    row = (
        _request_query(db)
        .filter(OrganizerRequest.request_id == request_id)
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu đăng ký ban tổ chức.",
        )

    request, user, organization_type = row
    attachments = _attachments_by_request(db, [request.request_id])
    return _serialize_request(
        request=request,
        user=user,
        organization_type=organization_type,
        attachments=attachments[request.request_id],
    )


def review_organizer_request(
    db: Session,
    request_id: UUID,
    decision: OrganizerRequestStatus,
    admin_id: UUID,
    decision_reason: str | None = None,
) -> dict:
    request = (
        db.query(OrganizerRequest)
        .filter(OrganizerRequest.request_id == request_id)
        .with_for_update()
        .first()
    )
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu đăng ký ban tổ chức.",
        )
    if request.status != OrganizerRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Yêu cầu này đã được xử lý trước đó.",
        )
    if decision not in {
        OrganizerRequestStatus.APPROVED,
        OrganizerRequestStatus.REJECTED,
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quyết định xét duyệt không hợp lệ.",
        )

    user = db.query(User).filter(User.user_id == request.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tài khoản của yêu cầu không còn tồn tại.",
        )

    request.status = decision
    request.reviewed_by = admin_id
    if decision == OrganizerRequestStatus.REJECTED:
        normalized_reason = (decision_reason or "").strip()
        if not normalized_reason:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Vui lòng nhập lý do từ chối.",
            )
        request.rejected_reason = normalized_reason
    else:
        request.rejected_reason = None
    user.status = (
        UserStatus.ACTIVE
        if decision == OrganizerRequestStatus.APPROVED
        else UserStatus.REJECTED
    )

    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật kết quả xét duyệt.",
        ) from error

    notification_type = (
        NotificationType.ORGANIZER_REQUEST_APPROVED
        if decision == OrganizerRequestStatus.APPROVED
        else NotificationType.ORGANIZER_REQUEST_REJECTED
    )
    notification_title = (
        "Yêu cầu Ban tổ chức đã được duyệt"
        if decision == OrganizerRequestStatus.APPROVED
        else "Yêu cầu Ban tổ chức đã bị từ chối"
    )
    notification_content = (
        "Tài khoản của bạn đã được cấp quyền Ban tổ chức."
        if decision == OrganizerRequestStatus.APPROVED
        else (
            "Hồ sơ đăng ký Ban tổ chức của bạn chưa được chấp nhận. "
            f"Lý do: {request.rejected_reason}"
        )
    )
    try:
        notification_service.create_notification(
            user_id=str(user.user_id),
            event_id=None,
            notification_type=notification_type,
            title=notification_title,
            content=notification_content,
        )
    except Exception:
        logger.exception(
            "Không thể tạo thông báo kết quả duyệt Ban tổ chức %s.",
            request.request_id,
        )

    return get_organizer_request(db=db, request_id=request_id)
