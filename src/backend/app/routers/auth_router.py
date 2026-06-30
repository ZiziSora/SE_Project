from fastapi import APIRouter, status, Depends, Response, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app.database import get_db
from app.core.auth import security
from app.schemas.auth import LoginResponse, LoginRequest, SignUpRequest, SignUpResponse
from sqlalchemy.orm import Session
from app.services.auth_services import signup_student, signup_organizer, login_service, logout_service
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=SignUpResponse, summary="Sign up")
def signup(data: SignUpRequest, db: Session = Depends(get_db)):
    if data.role == "student":
        return signup_student(data,db)
    elif data.role == "organizer":
        return signup_organizer(data,db)
    else:
        raise HTTPException(status_code=400, detail="Invalid role")


@router.post("/login", response_model=LoginResponse, summary="Log in")
def login(body: LoginRequest):
    return login_service(body)


@router.post("/logout", summary="Log out", status_code=status.HTTP_204_NO_CONTENT)
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    logout_service(credentials)
    return Response(status_code=204)

