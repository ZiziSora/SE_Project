from fastapi import APIRouter, status, Depends, Response, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app.database import get_db
from app.core.auth import security
from app.schemas.auth import EmailVerificationResponse, LoginResponse, LoginRequest, SignUpResponse, StudentSignUpRequest, OrganizerSignUpRequest
from sqlalchemy.orm import Session
from app.services.auth_services import signup_student, signup_organizer, login_service, logout_service, verify_student_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup/student", response_model=SignUpResponse, summary="Sign up as student")
def signup_student_route(data: StudentSignUpRequest, db: Session = Depends(get_db)):
    return signup_student(data, db)


@router.post("/signup/organizer", response_model=SignUpResponse, summary="Sign up as organizer")
def signup_organizer_route(data: OrganizerSignUpRequest, db: Session = Depends(get_db)):
    return signup_organizer(data, db)


@router.post("/login", response_model=LoginResponse, summary="Log in")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return login_service(body, db)


@router.post(
    "/verify-email/student",
    response_model=EmailVerificationResponse,
    summary="Activate a verified student account",
)
def verify_student_email_route(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return verify_student_email(credentials, db)


@router.post("/logout", summary="Log out", status_code=status.HTTP_204_NO_CONTENT)
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    logout_service(credentials)
    return Response(status_code=204)
