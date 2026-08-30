from fastapi import APIRouter, Depends, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.auth import get_current_user, security
from app.models.user import User
from app.schemas.auth import (
    EmailVerificationResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    OrganizerResubmissionResponse,
    OrganizerResubmitRequest,
    OrganizerResubmitResponse,
    OrganizerSignUpRequest,
    ResendVerificationRequest,
    ResendVerificationResponse,
    SignUpResponse,
    StudentSignUpRequest,
    VerificationStatusRequest,
)
from app.services.auth_services import (
    forgot_password_service,
    get_email_verification_status,
    get_organizer_resubmission,
    login_service,
    logout_service,
    resend_verification_email,
    resubmit_organizer_request,
    signup_organizer,
    signup_student,
    verify_email,
)

router = APIRouter(prefix="/auth", tags=["Xác thực"])


@router.post("/signup/student", response_model=SignUpResponse, summary="Đăng ký tài khoản sinh viên")
def signup_student_route(data: StudentSignUpRequest, db: Session = Depends(get_db)):
    return signup_student(data, db)


@router.post("/signup/organizer", response_model=SignUpResponse, summary="Đăng ký tài khoản ban tổ chức")
def signup_organizer_route(data: OrganizerSignUpRequest, db: Session = Depends(get_db)):
    return signup_organizer(data, db)


@router.get(
    "/organizer/resubmission",
    response_model=OrganizerResubmissionResponse,
    summary="Lấy hồ sơ Ban tổ chức bị từ chối để chỉnh sửa",
)
def get_organizer_resubmission_route(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_organizer_resubmission(current_user=current_user, db=db)


@router.post(
    "/organizer/resubmission",
    response_model=OrganizerResubmitResponse,
    summary="Nộp lại hồ sơ Ban tổ chức bị từ chối",
)
def resubmit_organizer_route(
    data: OrganizerResubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resubmit_organizer_request(
        data=data,
        current_user=current_user,
        db=db,
    )


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


@router.post(
    "/resend-verification",
    response_model=ResendVerificationResponse,
    summary="Gửi lại email xác thực",
)
def resend_verification_route(
    body: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    return resend_verification_email(body, db)


@router.post(
    "/verification-status",
    response_model=EmailVerificationResponse,
    summary="Đối soát trạng thái xác thực email",
)
def verification_status_route(
    body: VerificationStatusRequest,
    db: Session = Depends(get_db),
):
    return get_email_verification_status(body, db)


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
