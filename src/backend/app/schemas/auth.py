from pydantic import BaseModel, EmailStr, Field
from typing import Literal, List, Optional
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

class OrganizerProofFile(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=1, max_length=100)
    content_base64: str = Field(min_length=1, max_length=7_100_000)

class OrganizerSignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["organizer"]
    department_name: str = ""
    reason: str
    proof_urls: List[str] = Field(default_factory=list)
    proof_files: List[OrganizerProofFile] = Field(
        default_factory=list,
        max_length=5,
    )

class SignUpResponse(BaseModel):
    message: str
    user_id: str
    warning: Optional[str] = None
    verification_state: Optional[str] = None


class EmailVerificationResponse(BaseModel):
    message: str
    user_id: str
    role: Literal["student", "organizer"]
    status: Literal["pending", "active", "rejected"]


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ResendVerificationResponse(BaseModel):
    message: str
    retry_after_seconds: int = 60
    verification_state: Optional[str] = None


class VerificationStatusRequest(BaseModel):
    verification_state: str = Field(min_length=1, max_length=2048)


class OrganizerRequestResponse(BaseModel):
    request_id: UUID
    status: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str
