from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from supabase_auth.errors import AuthApiError

from app.database import get_db, supabase
from app.models.enum import UserRole, UserStatus
from app.models.user import User


security = HTTPBearer()


async def auth_middleware(request: Request, call_next):
    token = request.cookies.get("access_token")
    if token and token.startswith("Bearer "):
        request.headers.__dict__["lists"].append(
            (b"authorization", token.encode())
        )
    return await call_next(request)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    try:
        response = supabase.auth.get_user(credentials.credentials)
    except AuthApiError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã truy cập không hợp lệ hoặc đã hết hạn.",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dịch vụ xác thực đang tạm thời không khả dụng.",
        ) from error

    auth_user = response.user if response else None
    if auth_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã truy cập không hợp lệ hoặc đã hết hạn.",
        )

    db_user = (
        db.query(User)
        .filter(User.user_id == auth_user.id)
        .first()
    )
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hồ sơ người dùng không tồn tại.",
        )

    return db_user


def require_approved_organizer(
    user: User = Depends(get_current_user),
) -> User:
    if user.role != UserRole.ORGANIZER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn cần có quyền ban tổ chức.",
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản ban tổ chức đang chờ quản trị viên phê duyệt.",
        )

    return user


def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    if user.role != UserRole.ADMIN or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn cần có quyền quản trị viên.",
        )

    return user
