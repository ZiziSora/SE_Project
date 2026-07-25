import logging
from io import BytesIO
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.database import supabase
from app.models.user import User
from app.schemas.profile import AvatarUploadResponse

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
        supabase.storage.from_(AVATAR_BUCKET).remove([avatar_url])
    except Exception as e:
        logger.warning(f'The errro occured: {e}')
        pass

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

        supabase.storage.from_(AVATAR_BUCKET).upload(
            path=avatar_path,
            file=content,
            file_options={
                "content-type": file.content_type,
                "cache-control": "3600",
                "upsert": "false",
            },
        )

        avatar_url = (
            supabase.storage
            .from_(AVATAR_BUCKET)
            .get_public_url(avatar_path)
        )

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

def get_avatar_url(avatar_path: str | None) -> str | None:
    if not avatar_path:
        return None

    return (
        supabase.storage
        .from_(AVATAR_BUCKET)
        .get_public_url(avatar_path)
    )
