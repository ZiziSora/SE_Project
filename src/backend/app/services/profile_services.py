import logging
import re
from io import BytesIO
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from supabase_auth.errors import AuthApiError

from app.core.supabase_client import get_supabase
from app.database import supabase, supabase_admin
from app.models.enum import UserRole
from app.models.organization_type import OrganizationType
from app.models.user import User
from app.schemas.profile import (
    AvatarUploadResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    OrganizationTypeResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
)

logger = logging.getLogger(__name__)

AVATAR_BUCKET = "avatars"
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def validate_avatar(
    content: bytes,
    content_type: str | None,
) -> str:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG and WEBP images are allowed.",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Avatar must not exceed 2 MB.",
        )

    try:
        image = Image.open(BytesIO(content))
        image.verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid image.",
        )

    return ALLOWED_CONTENT_TYPES[content_type]

def delete_avatar_from_storage(avatar_url: str | None) -> None:
    if not avatar_url:
        return

    try:
        get_supabase().storage.from_(AVATAR_BUCKET).remove([avatar_url])
    except Exception as error:
        logger.warning("Failed to delete the previous avatar: %s", error)


def upload_avatar_service(
    file: UploadFile,
    current_user: User,
    db: Session,
) -> AvatarUploadResponse:
    try:
        content = file.file.read()
        extension = validate_avatar(
            content=content,
            content_type=file.content_type,
        )

        # Mỗi lần upload dùng tên mới để tránh CDN giữ ảnh cũ.
        filename = f"{uuid4()}.{extension}"
        avatar_path = f"{current_user.user_id}/{filename}"

        avatar_storage = get_supabase().storage.from_(AVATAR_BUCKET)
        avatar_storage.upload(
            path=avatar_path,
            file=content,
            file_options={
                "content-type": file.content_type,
                "cache-control": "3600",
                "upsert": "false",
            },
        )

        avatar_url = avatar_storage.get_public_url(avatar_path)

        old_avatar_path = current_user.avatar_url

        current_user.avatar_url = avatar_path
        db.commit()
        db.refresh(current_user)

        # Chỉ xóa ảnh cũ sau khi database đã lưu ảnh mới thành công.
        delete_avatar_from_storage(old_avatar_path)

        return AvatarUploadResponse(
            avatar_path=avatar_path,
            avatar_url=avatar_url,
        )

    except HTTPException:
        raise

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload avatar: {str(error)}",
        )

    finally:
        file.file.close()

def get_avatar_url(
    avatar_path: str | None,
    *,
    supabase_client: Any = None,
) -> str | None:
    if not avatar_path:
        return None

    normalized_path = avatar_path.strip()
    if not normalized_path:
        return None
    if normalized_path.startswith(("http://", "https://")):
        return normalized_path

    client = supabase_client or get_supabase()
    return client.storage.from_(AVATAR_BUCKET).get_public_url(normalized_path)


def update_profile_service(
    body: UpdateProfileRequest,
    current_user: User,
    db: Session,
) -> UpdateProfileResponse:
    full_name = body.full_name.strip()
    contact_phone = (body.contact_phone or "").strip()

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên hiển thị không được để trống.",
        )

    if len(full_name) > 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên hiển thị không được vượt quá 200 ký tự.",
        )

    if contact_phone and not re.fullmatch(
        r"[0-9+().\-\s]{7,25}",
        contact_phone,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại không hợp lệ.",
        )

    try:
        current_user.full_name = full_name
        current_user.contact_phone = contact_phone or None

        if current_user.role == UserRole.STUDENT:
            department_name = (body.department_name or "").strip()
            if len(department_name) > 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tên khoa hoặc đơn vị không được vượt quá 200 ký tự.",
                )
            current_user.department_name = department_name or None

        elif current_user.role == UserRole.ORGANIZER:
            office_address = (body.office_address or "").strip()

            if len(office_address) > 500:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Địa chỉ không được vượt quá 500 ký tự.",
                )

            current_user.office_address = office_address or None

            if body.organization_type_id:
                organization_type = (
                    db.query(OrganizationType)
                    .filter(
                        OrganizationType.organization_type_id
                        == body.organization_type_id
                    )
                    .first()
                )
                if organization_type is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Loại tổ chức không tồn tại.",
                    )
                current_user.organization_type = organization_type
            else:
                current_user.organization_type = None

        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản này không thể cập nhật hồ sơ tại đây.",
            )

        db.commit()
        db.refresh(current_user)
    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật thông tin tài khoản.",
        ) from error

    return UpdateProfileResponse(
        message="Cập nhật thông tin tài khoản thành công.",
    )


def list_organization_types_service(
    db: Session,
) -> list[OrganizationTypeResponse]:
    organization_types = (
        db.query(OrganizationType)
        .order_by(OrganizationType.name.asc())
        .all()
    )

    return [
        OrganizationTypeResponse(
            organization_type_id=item.organization_type_id,
            name=item.name,
        )
        for item in organization_types
    ]


def change_password_service(
    body: ChangePasswordRequest,
    current_user: User,
) -> ChangePasswordResponse:
    if (
        not body.current_password
        or not body.new_password
        or not body.confirm_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập đầy đủ thông tin mật khẩu.",
        )

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới cần có ít nhất 8 ký tự.",
        )

    if body.new_password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu xác nhận chưa khớp.",
        )

    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải khác mật khẩu hiện tại.",
        )

    try:
        supabase.auth.sign_in_with_password(
            {
                "email": current_user.email,
                "password": body.current_password,
            }
        )
    except AuthApiError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác.",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể xác minh mật khẩu lúc này. Vui lòng thử lại.",
        ) from error

    try:
        supabase_admin.auth.admin.update_user_by_id(
            str(current_user.user_id),
            {"password": body.new_password},
        )
    except AuthApiError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới không đáp ứng yêu cầu bảo mật.",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại.",
        ) from error

    return ChangePasswordResponse(
        message="Cập nhật mật khẩu thành công.",
    )
