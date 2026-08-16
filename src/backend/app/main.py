from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.auth import get_current_user
from app.core.config import CORS_ORIGINS
from app.models.enum import UserRole, UserStatus
from app.models.user import User
from app.routers import (
    categories,
    event_review,
    events,
    organizer_events,
    organizer_requests,
    uploads,
)
from app.routers.auth_router import router as auth_router
from app.routers.my_event import router as history_router
from app.routers.profile_router import router as user_router
from app.routers.events import router as events_router
from app.schemas.profile import UserProfileResponse
from app.services.profile_services import get_avatar_url

app = FastAPI(
    title="UniEvent API",
    description="API hệ sinh thái sự kiện đại học thông minh.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(history_router)
app.include_router(events.router)
app.include_router(organizer_events.router)
app.include_router(organizer_requests.router)
app.include_router(event_review.router)
app.include_router(categories.router)
app.include_router(uploads.router)


@app.exception_handler(RequestValidationError)
async def validation_handler(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Gộp các lỗi validation thành một thông báo dễ hiển thị."""
    messages = [
        error.get("msg", "").replace("Value error, ", "")
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": " ".join(messages) or "Dữ liệu không hợp lệ.",
        },
    )



@app.get("/")
def read_root():
    return {
        "message": (
            "Chào mừng đến với API Hệ sinh thái sự kiện "
            "đại học thông minh"
        )
    }


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "service": "unievent-api"}


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
            user.organization_type.name if user.organization_type else None
        ),
        "contact_phone": user.contact_phone,
        "office_address": user.office_address,
        "organization_description": user.organization_description,
        "can_manage_events": (
            user.role == UserRole.ORGANIZER and user.status == UserStatus.ACTIVE
        ),
    }
