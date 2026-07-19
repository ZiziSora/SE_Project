from pydantic import BaseModel, EmailStr
from typing import Literal, List
from uuid import UUID

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: Literal["student", "organizer", "admin"]
    status: Literal["pending", "active", "rejected"]
    can_manage_events: bool = False

class StudentSignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    department_name: str = ""

class OrganizerSignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["organizer"]
    department_name: str = ""
    reason: str
    proof_urls : List[str]

class SignUpResponse(BaseModel):
    message: str
    user_id: str


class EmailVerificationResponse(BaseModel):
    message: str
    user_id: str


class OrganizerRequestResponse(BaseModel):
    request_id: UUID
    status: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str