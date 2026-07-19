from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.auth import get_current_user
from app.models.enum import UserRole, UserStatus
from app.models.user import User
from app.routers.auth_router import router as auth_router

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


@app.get("/")
def read_root():
    return {"message": "Chào mừng đến với API Hệ sinh thái sự kiện đại học thông minh"}


@app.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "user_id": str(user.user_id),
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value if user.status else None,
        "can_manage_events": (
            user.role == UserRole.ORGANIZER
            and user.status == UserStatus.ACTIVE
        ),
    }
