from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.auth import get_current_user
from app.models.enum import UserRole, UserStatus
from app.models.user import User
from app.routers.auth_router import router as auth_router
from app.routers.my_event import router as history_router
from app.routers.profile_router import router as user_router
from app.schemas.profile import UserProfileResponse
from app.services.profile_services import get_avatar_url

app = FastAPI(title="API Hệ sinh thái sự kiện đại học thông minh")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(history_router)

@app.get("/")
def read_root():
    return {"message": "Chào mừng đến với API Hệ sinh thái sự kiện đại học thông minh"}


@app.get("/me", response_model=UserProfileResponse)
def get_me(user: User = Depends(get_current_user)):
    return {
        "user_id": user.user_id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value if user.status else None,
        "avatar_url": get_avatar_url(user.avatar_url),
        "student_code": user.student_code,
        "department_name": user.department_name,
        "organization_type_id": user.organization_type_id,
        "organization_type": (
            user.organization_type.name
            if user.organization_type
            else None
        ),
        "contact_phone": user.contact_phone,
        "office_address": user.office_address,
        "organization_description": user.organization_description,
        "can_manage_events": (
            user.role == UserRole.ORGANIZER
            and user.status == UserStatus.ACTIVE
        ),
    }
