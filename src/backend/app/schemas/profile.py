from pydantic import BaseModel, EmailStr
from uuid import UUID


class AvatarUploadResponse(BaseModel):
    avatar_path: str
    avatar_url: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class ChangePasswordResponse(BaseModel):
    message: str


class UserProfileResponse(BaseModel):
    user_id: UUID
    full_name: str | None = None
    email: EmailStr
    role: str
    status: str | None = None
    avatar_url: str | None = None
    student_code: str | None = None
    department_name: str | None = None
    organization_type: str | None = None
    contact_phone: str | None = None
    office_address: str | None = None
    organization_description: str | None = None
    can_manage_events: bool = False
