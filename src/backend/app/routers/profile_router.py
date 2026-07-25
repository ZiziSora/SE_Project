from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.profile import (
    AvatarUploadResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    OrganizationTypeResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
)
from app.services.profile_services import (
    change_password_service,
    list_organization_types_service,
    update_profile_service,
    upload_avatar_service,
)

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get(
    "/organization-types",
    response_model=list[OrganizationTypeResponse],
)
def list_organization_types(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_organization_types_service(db)


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


@router.put(
    "/me/password",
    response_model=ChangePasswordResponse,
)
def change_my_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
):
    return change_password_service(
        body=body,
        current_user=current_user,
    )


@router.put(
    "/me/profile",
    response_model=UpdateProfileResponse,
)
def update_my_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_profile_service(
        body=body,
        current_user=current_user,
        db=db,
    )
