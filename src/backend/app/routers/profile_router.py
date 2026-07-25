from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.profile import AvatarUploadResponse
from app.services.profile_services import upload_avatar_service

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)
@router.put(
    "/me/avatar",
    response_model=AvatarUploadResponse,
)
def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return upload_avatar_service(
        file=file,
        current_user=current_user,
        db=db,
    )
