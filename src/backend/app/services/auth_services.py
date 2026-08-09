from app.models.user import User
from app.models.organizer_request import OrganizerRequest
from app.models.organizer_request_attachment import OrganizerRequestAttachment
from app.models.enum import UserRole, UserStatus, OrganizerRequestStatus
from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError
from app.database import supabase, supabase_admin
from app.schemas.auth import (
    EmailVerificationResponse,
    LoginResponse,
    LoginRequest,
    StudentSignUpRequest,
    OrganizerSignUpRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse
)
from sqlalchemy.orm import Session
import uuid
import re
import os


STUDENT_EMAIL_DOMAIN = "student.hcmus.edu.vn"
STUDENT_CODE_PATTERN = re.compile(r"^\d{8}$")
FRONTEND_URL = (
    os.getenv("FRONTEND_URL") or "http://localhost:5173"
).rstrip("/")

def extract_student_code(email: str) -> str:
    normalized_email = email.strip().lower()

    try:
        local_part, domain = normalized_email.rsplit("@", 1)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Định dạng email không hợp lệ.",
        )

    if domain != STUDENT_EMAIL_DOMAIN:
        raise HTTPException(
            status_code=400,
            detail=(
                "Sinh viên phải đăng ký bằng email "
                f"@{STUDENT_EMAIL_DOMAIN}."
            ),
        )

    if not STUDENT_CODE_PATTERN.fullmatch(local_part):
        raise HTTPException(
            status_code=400,
            detail="Định dạng email sinh viên không hợp lệ.",
        )

    return local_part

def validate_student_identity(
    email: str,
    db_user: User,
) -> None:
    if db_user.role != UserRole.STUDENT:
        return

    extracted_code = extract_student_code(email)

    if db_user.student_code != extracted_code:
        raise HTTPException(
            status_code=403,
            detail="Thông tin tài khoản sinh viên không nhất quán.",
        )


def find_auth_user_by_email(email: str):
    users = supabase_admin.auth.admin.list_users(
        page=1,
        per_page=1000,
    )
    normalized_email = email.strip().lower()

    return next(
        (
            user
            for user in users
            if user.email and user.email.strip().lower() == normalized_email
        ),
        None,
    )


def signup_student(data: StudentSignUpRequest, db: Session):
    email = str(data.email).strip().lower()
    student_code = extract_student_code(email)

    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email đã được đăng ký.",
        )

    existing_student_code = (
        db.query(User)
        .filter(User.student_code == student_code)
        .first()
    )

    if existing_student_code:
        raise HTTPException(
            status_code=409,
            detail="Mã số sinh viên đã được đăng ký.",
        )

    try:
        existing_auth_user = find_auth_user_by_email(email)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể kiểm tra tài khoản xác thực. Vui lòng thử lại sau.",
        ) from error

    if existing_auth_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Email đã tồn tại trong hệ thống xác thực. "
                "Vui lòng xác minh tài khoản hiện có hoặc liên hệ quản trị viên."
            ),
        )

    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": data.password,
            "options": {
                "email_redirect_to": "http://localhost:5173/auth/callback",
                "data": {
                    "role": UserRole.STUDENT.value,
                },
            },
        })
    except Exception as error:
        try:
            incomplete_auth_user = find_auth_user_by_email(email)
            if incomplete_auth_user:
                supabase_admin.auth.admin.delete_user(incomplete_auth_user.id)
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Yêu cầu đăng ký đã hết thời gian chờ hoặc không thể gửi email xác minh. "
                "Đăng ký chưa được lưu; vui lòng thử lại sau."
            ),
        ) from error

    if response.user is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Dịch vụ xác thực trả về dữ liệu không hợp lệ.",
        )

    supabase_user = response.user
    user = User(
        user_id = supabase_user.id,
        email = email,
        full_name = data.full_name,
        department_name = data.department_name,
        role = UserRole.STUDENT,
        status = UserStatus.PENDING,
        student_code = student_code
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception as error:
        db.rollback()
        try:
            supabase_admin.auth.admin.delete_user(supabase_user.id)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail="Không thể lưu hồ sơ sinh viên.",
        ) from error

    return {
        "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
        "user_id": str(user.user_id)
    }

def signup_organizer(data: OrganizerSignUpRequest, db: Session):
    existing_user = (db.query(User)
                     .filter(User.email == data.email)
                     .first())
    if existing_user: 
        raise HTTPException(status_code=400, detail="Email đã tồn tại.")
    
    try: 
        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "email_redirect_to": "http://localhost:5173/auth/callback",
                "data": {
                    "role": UserRole.ORGANIZER.value,
                },
            },
        })
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail="Không thể tạo tài khoản ban tổ chức.",
        ) from error
    if not response.user: 
        raise HTTPException(status_code=400, detail="Không thể tạo tài khoản.")
    

    supabase_user = response.user
    try:
        user = User(
            user_id = supabase_user.id, 
            email = data.email, 
            full_name = data.full_name, 
            department_name = data.department_name,
            role = UserRole(data.role),
            status = UserStatus.PENDING
        )

        db.add(user)
        db.flush()  # Đảm bảo user được ghi vào DB trước khi insert organizer_request

        request = OrganizerRequest(
            user_id = supabase_user.id,
            reason = data.reason, 
            status = OrganizerRequestStatus.PENDING
        )

        db.add(request)
        db.flush()  # Đảm bảo request_id được generate trước khi insert attachments

        if data.proof_urls and len(data.proof_urls) > 0: 
            for url in data.proof_urls: 
                attachment = OrganizerRequestAttachment(
                    attachment_id = uuid.uuid4(),
                    request_id  = request.request_id,
                    url = url
                )
                db.add(attachment)
        db.commit()
        db.refresh(user)

        return {"message": "Đăng ký thành công. Vui lòng chờ quản trị viên phê duyệt.", "user_id": str(supabase_user.id)}
    except Exception as error:
        db.rollback()
        supabase_admin.auth.admin.delete_user(supabase_user.id)

        raise HTTPException(
            status_code=500,
            detail="Không thể hoàn tất đăng ký tài khoản.",
        ) from error

        
    
        
    
    


def login_service(body: LoginRequest, db: Session):
    email = str(body.email).strip().lower()

    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": body.password,
        })
    except AuthApiError as error:
        if error.code == "email_not_confirmed":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email chưa được xác minh. Vui lòng kiểm tra hộp thư.",
            ) from error

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dịch vụ xác thực đang tạm thời không khả dụng.",
        ) from error

    session = response.session
    user = response.user

    if session is None or user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
        )

    db_user = (
            db.query(User)
            .filter(User.user_id == user.id)
            .first()
        )

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hồ sơ người dùng không tồn tại.",
        )

    if db_user.status is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trạng thái tài khoản chưa được thiết lập. Vui lòng liên hệ quản trị viên.",
        )

    if db_user.role == UserRole.STUDENT:
        validate_student_identity(
            email=user.email or email,
            db_user=db_user,
        )

        if (
            db_user.status == UserStatus.PENDING
            and user.email_confirmed_at is not None
        ):
            db_user.status = UserStatus.ACTIVE
            db.commit()
            db.refresh(db_user)

    if (
        db_user.role == UserRole.ORGANIZER
        and db_user.status == UserStatus.REJECTED
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản ban tổ chức đã bị từ chối.",
        )

    if (
        db_user.role != UserRole.ORGANIZER
        and db_user.status != UserStatus.ACTIVE
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chưa hoạt động. Vui lòng xác minh email hoặc chờ phê duyệt.",
        )

    return LoginResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user_id=str(user.id),
        email=user.email or email,
        role=db_user.role.value,
        status=db_user.status.value,
        can_manage_events=(
            db_user.role == UserRole.ORGANIZER
            and db_user.status == UserStatus.ACTIVE
        ),
    )


def verify_email(
    credentials,
    db: Session,
) -> EmailVerificationResponse:
    access_token = credentials.credentials

    try:
        response = supabase.auth.get_user(access_token)
    except AuthApiError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Liên kết xác minh email không hợp lệ hoặc đã hết hạn.",
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
            detail="Liên kết xác minh email không hợp lệ hoặc đã hết hạn.",
        )

    if auth_user.email_confirmed_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email chưa được xác minh.",
        )

    db_user = (
        db.query(User)
        .filter(User.user_id == auth_user.id)
        .first()
    )

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hồ sơ người dùng không tồn tại.",
        )

    if db_user.role not in {UserRole.STUDENT, UserRole.ORGANIZER}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này không sử dụng quy trình xác minh email đăng ký.",
        )

    if db_user.status == UserStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị từ chối.",
        )

    if db_user.role == UserRole.STUDENT:
        validate_student_identity(
            email=auth_user.email,
            db_user=db_user,
        )

        if db_user.status != UserStatus.ACTIVE:
            db_user.status = UserStatus.ACTIVE
            db.commit()
            db.refresh(db_user)

        message = "Email đã được xác minh và tài khoản sinh viên đã được kích hoạt."
    else:
        message = (
            "Email đã được xác minh. Tài khoản ban tổ chức đang chờ quản trị viên phê duyệt."
        )

    return EmailVerificationResponse(
        message=message,
        user_id=str(db_user.user_id),
    )


def logout_service(credentials):
    try:
        supabase.auth.sign_out()
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Đăng xuất không thành công.",
        ) from error


def forgot_password_service(body: ForgotPasswordRequest) -> ForgotPasswordResponse:
    email = body.email.strip().lower()


    try:
        supabase.auth.reset_password_for_email(
            email,
            {
                "redirect_to": (
                    f"{FRONTEND_URL}/auth/reset-password"
                )
            },
        )

        return ForgotPasswordResponse(
            message=(
                "Nếu email này thuộc một tài khoản, "
                "liên kết đặt lại mật khẩu đã được gửi."
            )
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể gửi email đặt lại mật khẩu.",
        )
