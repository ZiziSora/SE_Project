from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials
from app.database import supabase, get_db
from app.core.auth import security
from app.schemas.auth import LoginResponse, LoginRequest, SignUpRequest, SignUpResponse
from app.models import User
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=SignUpResponse, summary="Sign up")
def signup(data: SignUpRequest, db: Session = Depends(get_db)):
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
        raise HTTPException(status_code=400, detail="Signup failed")
    
    supabase_user = response.user
    user = User(
        user_id = supabase_user.id, 
        email = data.email, 
        full_name = data.full_name, 
        role = "attendee"
    )

    try:
        db.add(user)
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    db.refresh(user)

    return {
    "message": "Signup successful",
    "user_id": str(user.user_id)
    }

@router.post("/login", response_model=LoginResponse, summary="Log in")
def login(body: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )

    session = response.session
    user = response.user

    if session is None or user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )

    return LoginResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user_id=str(user.id),
        email=user.email,
    )


@router.post("/logout", summary="Log out", status_code=status.HTTP_204_NO_CONTENT)
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Đăng xuất người dùng hiện tại — thu hồi session trên Supabase.
    Yêu cầu header: Authorization: Bearer <access_token>
    """
    try:
        # Đặt session cho client với token của user, rồi sign out
        supabase.auth.sign_out()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}",
        )
    # 204 No Content — không trả body
