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
    OrganizerProofFile,
    ResendVerificationRequest,
    ResendVerificationResponse,
    VerificationStatusRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse
)
from sqlalchemy.orm import Session
from dataclasses import dataclass
from app.core.config import SUPABASE_SERVICE_ROLE_KEY
import base64
import binascii
import hashlib
import hmac
import json
import logging
import math
import threading
import time
import uuid
import re
import os
from urllib.parse import quote


logger = logging.getLogger(__name__)


STUDENT_EMAIL_DOMAIN = "student.hcmus.edu.vn"
STUDENT_CODE_PATTERN = re.compile(r"^\d{8}$")
FRONTEND_URL = (
    os.getenv("FRONTEND_URL") or "http://localhost:5173"
).rstrip("/")
ORGANIZER_PROOF_BUCKET = "organizer_proofs"
ORGANIZER_PROOF_MAX_BYTES = 5 * 1024 * 1024
ORGANIZER_PROOF_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
VERIFICATION_RESEND_COOLDOWN_SECONDS = 60
VERIFICATION_STATE_TTL_SECONDS = 24 * 60 * 60
_verification_resend_attempts: dict[str, float] = {}
_verification_resend_lock = threading.Lock()


def create_verification_state(email: str, role: UserRole) -> str:
    payload = {
        "email": email.strip().lower(),
        "role": role.value,
        "expires_at": int(time.time()) + VERIFICATION_STATE_TTL_SECONDS,
    }
    encoded_payload = base64.urlsafe_b64encode(
        json.dumps(
            payload,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    signature = hmac.new(
        SUPABASE_SERVICE_ROLE_KEY.encode("utf-8"),
        encoded_payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(
        b"="
    ).decode("ascii")
    return f"{encoded_payload}.{encoded_signature}"


def decode_verification_state(verification_state: str) -> dict:
    try:
        encoded_payload, encoded_signature = verification_state.split(".", 1)
        expected_signature = hmac.new(
            SUPABASE_SERVICE_ROLE_KEY.encode("utf-8"),
            encoded_payload.encode("ascii"),
            hashlib.sha256,
        ).digest()
        supplied_signature = base64.urlsafe_b64decode(
            encoded_signature + "=" * (-len(encoded_signature) % 4)
        )
        if not hmac.compare_digest(expected_signature, supplied_signature):
            raise ValueError("Invalid signature")

        payload = json.loads(
            base64.urlsafe_b64decode(
                encoded_payload + "=" * (-len(encoded_payload) % 4)
            ).decode("utf-8")
        )
        if int(payload["expires_at"]) < int(time.time()):
            raise ValueError("Expired state")
        if payload.get("role") not in {
            UserRole.STUDENT.value,
            UserRole.ORGANIZER.value,
        }:
            raise ValueError("Invalid role")
        if not payload.get("email"):
            raise ValueError("Missing email")
        return payload
    except (
        binascii.Error,
        KeyError,
        TypeError,
        ValueError,
        json.JSONDecodeError,
    ) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thông tin xác minh không hợp lệ hoặc đã hết hạn.",
        ) from error


def build_verification_redirect(verification_state: str) -> str:
    return (
        f"{FRONTEND_URL}/auth/callback?verification_state="
        f"{quote(verification_state, safe='')}"
    )


@dataclass(frozen=True)
class DecodedOrganizerProof:
    content: bytes
    content_type: str
    extension: str


def decode_organizer_proofs(
    proof_files: list[OrganizerProofFile],
) -> list[DecodedOrganizerProof]:
    decoded_files = []

    for proof in proof_files:
        content_type = proof.content_type.strip().lower().split(";", 1)[0]
        extension = ORGANIZER_PROOF_TYPES.get(content_type)
        if extension is None:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Tệp '{proof.filename}' không đúng định dạng cho phép. "
                    "Chỉ chấp nhận PDF, Word hoặc hình ảnh."
                ),
            )

        try:
            content = base64.b64decode(
                proof.content_base64,
                validate=True,
            )
        except (binascii.Error, ValueError) as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Không thể đọc tệp '{proof.filename}'.",
            ) from error

        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tệp '{proof.filename}' không có nội dung.",
            )
        if len(content) > ORGANIZER_PROOF_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Tệp '{proof.filename}' vượt quá giới hạn 5MB.",
            )

        decoded_files.append(
            DecodedOrganizerProof(
                content=content,
                content_type=content_type,
                extension=extension,
            )
        )

    return decoded_files


def upload_organizer_proofs(
    user_id,
    proof_files: list[DecodedOrganizerProof],
) -> tuple[list[str], list[str]]:
    if not proof_files:
        return [], []

    storage = supabase_admin.storage.from_(ORGANIZER_PROOF_BUCKET)
    uploaded_urls = []
    uploaded_paths = []

    try:
        for proof in proof_files:
            object_path = (
                f"proofs/{user_id}/{uuid.uuid4().hex}{proof.extension}"
            )
            storage.upload(
                path=object_path,
                file=proof.content,
                file_options={
                    "content-type": proof.content_type,
                    "upsert": "false",
                },
            )
            uploaded_paths.append(object_path)
            uploaded_urls.append(storage.get_public_url(object_path))
    except Exception as error:
        if uploaded_paths:
            try:
                storage.remove(uploaded_paths)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không thể tải tài liệu minh chứng. Vui lòng thử lại.",
        ) from error

    return uploaded_urls, uploaded_paths


def cleanup_organizer_signup(user_id, uploaded_paths: list[str]) -> None:
    if uploaded_paths:
        try:
            supabase_admin.storage.from_(ORGANIZER_PROOF_BUCKET).remove(
                uploaded_paths
            )
        except Exception:
            pass

    try:
        supabase_admin.auth.admin.delete_user(user_id)
    except Exception:
        pass

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
    verification_state = create_verification_state(
        email,
        UserRole.STUDENT,
    )

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
                "email_redirect_to": build_verification_redirect(
                    verification_state
                ),
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
        "user_id": str(user.user_id),
        "verification_state": verification_state,
    }

def signup_organizer(data: OrganizerSignUpRequest, db: Session):
    decoded_proofs = decode_organizer_proofs(data.proof_files)
    email = str(data.email).strip().lower()
    verification_state = create_verification_state(
        email,
        UserRole.ORGANIZER,
    )
    existing_user = (db.query(User)
                     .filter(User.email == email)
                     .first())
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được đăng ký.",
        )

    try:
        existing_auth_user = find_auth_user_by_email(email)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể kiểm tra tài khoản xác thực. Vui lòng thử lại sau.",
        ) from error

    if existing_auth_user:
        if existing_auth_user.email_confirmed_at is None:
            try:
                supabase_admin.auth.admin.delete_user(existing_auth_user.id)
            except Exception as error:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "Không thể khôi phục lần đăng ký trước. "
                        "Vui lòng thử lại sau."
                    ),
                ) from error
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Email đã tồn tại trong hệ thống xác thực. "
                    "Vui lòng đăng nhập hoặc liên hệ quản trị viên."
                ),
            )
    
    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": data.password,
            "options": {
                "email_redirect_to": build_verification_redirect(
                    verification_state
                ),
                "data": {
                    "role": UserRole.ORGANIZER.value,
                },
            },
        })
    except Exception as error:
        try:
            incomplete_auth_user = find_auth_user_by_email(email)
            if (
                incomplete_auth_user
                and incomplete_auth_user.email_confirmed_at is None
            ):
                supabase_admin.auth.admin.delete_user(incomplete_auth_user.id)
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Không thể tạo tài khoản hoặc gửi email xác minh. "
                "Đăng ký chưa được lưu; vui lòng thử lại sau."
            ),
        ) from error
    if not response.user:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Dịch vụ xác thực trả về dữ liệu không hợp lệ.",
        )
    
    supabase_user = response.user
    uploaded_paths = []
    upload_warning = None
    try:
        user = User(
            user_id = supabase_user.id, 
            email = email,
            full_name = data.full_name, 
            department_name = data.department_name,
            role = UserRole(data.role),
            status = UserStatus.PENDING
        )

        db.add(user)
        db.flush() 

        request = OrganizerRequest(
            user_id = supabase_user.id,
            reason = data.reason, 
            status = OrganizerRequestStatus.PENDING
        )

        db.add(request)
        db.flush() 

        try:
            uploaded_urls, uploaded_paths = upload_organizer_proofs(
                supabase_user.id,
                decoded_proofs,
            )
        except HTTPException:
            uploaded_urls = []
            uploaded_paths = []
            upload_warning = (
                "Tài khoản đã được tạo nhưng tài liệu minh chứng chưa thể tải "
                "lên. Quản trị viên sẽ xét duyệt dựa trên thông tin bạn cung cấp."
            )
        proof_urls = [*data.proof_urls, *uploaded_urls]

        if proof_urls:
            for url in proof_urls:
                attachment = OrganizerRequestAttachment(
                    attachment_id = uuid.uuid4(),
                    request_id  = request.request_id,
                    url = url
                )
                db.add(attachment)
        db.commit()

        return {
            "message": (
                "Đăng ký thành công. Vui lòng xác minh email và chờ quản trị "
                "viên phê duyệt."
            ),
            "user_id": str(supabase_user.id),
            "warning": upload_warning,
            "verification_state": verification_state,
        }
    except HTTPException:
        db.rollback()
        cleanup_organizer_signup(supabase_user.id, uploaded_paths)
        raise
    except Exception as error:
        db.rollback()
        cleanup_organizer_signup(supabase_user.id, uploaded_paths)

        raise HTTPException(
            status_code=500,
            detail=f"Lỗi Database: {str(error)}",
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
        # 503 ở đây KHÔNG phải "sai mật khẩu" — nghĩa là không gọi được
        # Supabase Auth (mất mạng, project bị pause, sai SUPABASE_URL/khoá...).
        # Không log thì thông báo cho người dùng che mất nguyên nhân thật.
        logger.exception(
            "Không gọi được Supabase Auth khi đăng nhập (%s): %s",
            type(error).__name__,
            error,
        )
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
        db_user.role == UserRole.ORGANIZER
        and db_user.status != UserStatus.ACTIVE
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản ban tổ chức đang chờ quản trị viên phê duyệt.",
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
        logger.exception(
            "Không gọi được Supabase Auth khi xác minh email (%s): %s",
            type(error).__name__,
            error,
        )
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
    elif db_user.status == UserStatus.ACTIVE:
        message = (
            "Email đã được xác minh và tài khoản ban tổ chức đã được phê duyệt."
        )
    else:
        message = (
            "Email đã được xác minh. Tài khoản ban tổ chức đang chờ quản trị viên phê duyệt."
        )

    return EmailVerificationResponse(
        message=message,
        user_id=str(db_user.user_id),
        role=db_user.role.value,
        status=db_user.status.value,
    )


def get_email_verification_status(
    body: VerificationStatusRequest,
    db: Session,
) -> EmailVerificationResponse:
    state = decode_verification_state(body.verification_state)
    email = state["email"]
    expected_role = UserRole(state["role"])
    db_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if db_user is None or db_user.role != expected_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ đăng ký cần xác minh.",
        )

    try:
        response = supabase_admin.auth.admin.get_user_by_id(
            str(db_user.user_id)
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể kiểm tra trạng thái xác minh email.",
        ) from error

    auth_user = response.user if response else None
    if (
        auth_user is None
        or not auth_user.email
        or auth_user.email.strip().lower() != email
        or auth_user.email_confirmed_at is None
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email chưa được xác minh.",
        )

    if db_user.status == UserStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị từ chối.",
        )

    if db_user.role == UserRole.STUDENT:
        validate_student_identity(auth_user.email, db_user)
        if db_user.status != UserStatus.ACTIVE:
            db_user.status = UserStatus.ACTIVE
            db.commit()
            db.refresh(db_user)
        message = "Email đã được xác minh và tài khoản sinh viên đã được kích hoạt."
    elif db_user.status == UserStatus.ACTIVE:
        message = (
            "Email đã được xác minh và tài khoản ban tổ chức đã được phê duyệt."
        )
    else:
        message = (
            "Email đã được xác minh. Tài khoản ban tổ chức đang chờ quản trị "
            "viên phê duyệt."
        )

    return EmailVerificationResponse(
        message=message,
        user_id=str(db_user.user_id),
        role=db_user.role.value,
        status=db_user.status.value,
    )


def resend_verification_email(
    body: ResendVerificationRequest,
    db: Session,
) -> ResendVerificationResponse:
    email = str(body.email).strip().lower()
    current_time = time.monotonic()

    with _verification_resend_lock:
        previous_attempt = _verification_resend_attempts.get(email)
        if previous_attempt is not None:
            elapsed = current_time - previous_attempt
            if elapsed < VERIFICATION_RESEND_COOLDOWN_SECONDS:
                retry_after = max(
                    1,
                    math.ceil(
                        VERIFICATION_RESEND_COOLDOWN_SECONDS - elapsed
                    ),
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Vui lòng chờ {retry_after} giây trước khi gửi lại email."
                    ),
                    headers={"Retry-After": str(retry_after)},
                )

        # Giữ chỗ trước khi gọi Supabase để hai request đồng thời không thể
        # cùng gửi email.
        _verification_resend_attempts[email] = current_time

    user = db.query(User).filter(User.email == email).first()
    if user is None or user.status == UserStatus.REJECTED:
        return ResendVerificationResponse(
            message=(
                "Nếu email này thuộc một tài khoản đang chờ xác minh, "
                "email xác thực đã được gửi lại."
            )
        )

    verification_state = create_verification_state(email, user.role)

    try:
        supabase.auth.resend(
            {
                "type": "signup",
                "email": email,
                "options": {
                    "email_redirect_to": build_verification_redirect(
                        verification_state
                    ),
                },
            }
        )
    except AuthApiError as error:
        if error.status == 429 or error.code in {
            "over_request_rate_limit",
            "over_email_send_rate_limit",
        }:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Email vừa được gửi. Vui lòng chờ 60 giây để thử lại.",
                headers={
                    "Retry-After": str(
                        VERIFICATION_RESEND_COOLDOWN_SECONDS
                    )
                },
            ) from error

        with _verification_resend_lock:
            _verification_resend_attempts.pop(email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể gửi lại email xác thực.",
        ) from error
    except Exception as error:
        with _verification_resend_lock:
            _verification_resend_attempts.pop(email, None)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dịch vụ gửi email đang tạm thời không khả dụng.",
        ) from error

    return ResendVerificationResponse(
        message="Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.",
        verification_state=verification_state,
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
