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
)
from sqlalchemy.orm import Session
import uuid
import re

STUDENT_EMAIL_DOMAIN = "student.hcmus.edu.vn"
STUDENT_CODE_PATTERN = re.compile(r"^\d{8}$")

def extract_student_code(email: str) -> str:
    normalized_email = email.strip().lower()

    try:
        local_part, domain = normalized_email.rsplit("@", 1)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid email format.",
        )

    if domain != STUDENT_EMAIL_DOMAIN:
        raise HTTPException(
            status_code=400,
            detail=(
                "Students must register using "
                f"an @{STUDENT_EMAIL_DOMAIN} email."
            ),
        )

    if not STUDENT_CODE_PATTERN.fullmatch(local_part):
        raise HTTPException(
            status_code=400,
            detail="Invalid student email format.",
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
            detail="Student account information is inconsistent.",
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
            detail="Email is already registered.",
        )

    existing_student_code = (
        db.query(User)
        .filter(User.student_code == student_code)
        .first()
    )

    if existing_student_code:
        raise HTTPException(
            status_code=409,
            detail="Student code is already registered.",
        )

    try:
        existing_auth_user = find_auth_user_by_email(email)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify the authentication account. Please try again later.",
        ) from error

    if existing_auth_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Email is already registered in the authentication system. "
                "Please verify the existing account or contact an administrator."
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
                "Registration timed out or the verification email could not be sent. "
                "No active registration was kept; please try again later."
            ),
        ) from error

    if response.user is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Authentication service returned an invalid response.",
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
            detail="Failed to save the student profile.",
        ) from error

    return {
        "message": "Signup successful. Please check your email to verify your account.",
        "user_id": str(user.user_id)
    }

def signup_organizer(data: OrganizerSignUpRequest, db: Session):
    existing_user = (db.query(User)
                     .filter(User.email == data.email)
                     .first())
    if existing_user: 
        raise HTTPException(status_code=400, detail="Email already exists")
    
    try: 
        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password
        })
    except Exception as e: 
        raise HTTPException(status_code=400, detail=str(e))
    if not response.user: 
        raise HTTPException(status_code=400, detail="Cannot create account")
    

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

        return {"message": "Sign up successfully, please wait for approval", "user_id": str(supabase_user.id)}
    except Exception as e: 
        db.rollback()
        supabase_admin.auth.admin.delete_user(supabase_user.id)

        raise HTTPException(status_code=500, detail=f"Cannot complete sign up: {str(e)}")

        
    
        
    
    


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
                detail="Email has not been verified. Please check your inbox.",
            ) from error

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        ) from error

    session = response.session
    user = response.user

    if session is None or user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )

    db_user = (
            db.query(User)
            .filter(User.user_id == user.id)
            .first()
        )

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile does not exist.",
        )

    if db_user.status is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account status is not configured. Please contact an administrator.",
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

    if db_user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active. Please verify your email or wait for approval.",
        )

    return LoginResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user_id=str(user.id),
        email=user.email or email,
    )


def verify_student_email(
    credentials,
    db: Session,
) -> EmailVerificationResponse:
    access_token = credentials.credentials

    try:
        response = supabase.auth.get_user(access_token)
    except AuthApiError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The email verification link is invalid or has expired.",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        ) from error

    auth_user = response.user if response else None
    if auth_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The email verification link is invalid or has expired.",
        )

    if auth_user.email_confirmed_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email has not been verified.",
        )

    db_user = (
        db.query(User)
        .filter(User.user_id == auth_user.id)
        .first()
    )

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile does not exist.",
        )

    if db_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This verification endpoint is only for student accounts.",
        )

    validate_student_identity(
        email=auth_user.email,
        db_user=db_user,
    )

    if db_user.status == UserStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been rejected.",
        )

    if db_user.status != UserStatus.ACTIVE:
        db_user.status = UserStatus.ACTIVE
        db.commit()
        db.refresh(db_user)

    return EmailVerificationResponse(
        message="Email verified and student account activated.",
        user_id=str(db_user.user_id),
    )


def logout_service(credentials):                        
    try:
        supabase.auth.sign_out()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}",
        )
