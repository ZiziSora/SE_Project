from fastapi import APIRouter, status, Depends, Response, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app.database import get_db
from app.core.auth import security
from app.schemas.auth import EmailVerificationResponse, LoginResponse, LoginRequest, SignUpResponse, StudentSignUpRequest, OrganizerSignUpRequest, ForgotPasswordRequest, ForgotPasswordResponse
from sqlalchemy.orm import Session
from app.services.auth_services import signup_student, signup_organizer, login_service, logout_service, verify_email, forgot_password_service

router = APIRouter(prefix="/auth", tags=["Xác thực"])


@router.post("/signup/student", response_model=SignUpResponse, summary="Đăng ký tài khoản sinh viên")
def signup_student_route(data: StudentSignUpRequest, db: Session = Depends(get_db)):
    return signup_student(data, db)


@router.post("/signup/organizer", response_model=SignUpResponse, summary="Đăng ký tài khoản ban tổ chức")
def signup_organizer_route(data: OrganizerSignUpRequest, db: Session = Depends(get_db)):
    return signup_organizer(data, db)


@router.post("/login", response_model=LoginResponse, summary="Đăng nhập")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return login_service(body, db)


@router.post(
    "/verify-email",
    response_model=EmailVerificationResponse,
    summary="Hoàn tất xác minh email",
)
def verify_email_route(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return verify_email(credentials, db)


@router.post("/logout", summary="Đăng xuất", status_code=status.HTTP_204_NO_CONTENT)
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    logout_service(credentials)
    return Response(status_code=204)

@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_200_OK,
)
def forgot_password(
    body: ForgotPasswordRequest,
) -> ForgotPasswordResponse:
    return forgot_password_service(body)
