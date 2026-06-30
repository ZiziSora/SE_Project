from app.models.user import User
from app.models.organizer_request import OrganizerRequest
from app.models.organizer_request_attachment import OrganizerRequestAttachment
from app.models.enum import UserRole, UserStatus, OrganizerRequestStatus
from fastapi import HTTPException, status
from app.database import supabase, supabase_admin
from app.schemas.auth import LoginResponse, LoginRequest, SignUpRequest, OrganizerSignUpRequest
from sqlalchemy.orm import Session
import uuid


def signup_student(data: SignUpRequest, db: Session):
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
        department_name = data.department_name,
        role = UserRole(data.role),
        status = UserStatus.ACTIVE
    )

    try:
        db.add(user)
        db.commit()
    except Exception:
        db.rollback()
        supabase_admin.auth.admin.delete_user(supabase_user.id)
        raise
    
    db.refresh(user)

    return {
    "message": "Signup successful",
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

        
    
        
    
    


def login_service(body: LoginRequest):
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


def logout_service(credentials):                        
    try:
        supabase.auth.sign_out()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}",
        )
