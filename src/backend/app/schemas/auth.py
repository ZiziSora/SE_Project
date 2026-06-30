from pydantic import BaseModel, EmailStr, Field
from typing import Literal, List, Annotated, Union
from uuid import UUID
from datetime import datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: str

class StudentSignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["student"]
    department_name: str = ""

class OrganizerSignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["organizer"]
    department_name: str = ""
    reason: str
    proof_urls : List[str]

SignUpRequest = Annotated[
    Union[StudentSignUpRequest, OrganizerSignUpRequest], 
    Field(discriminator="role")
]


class SignUpResponse(BaseModel):
    message: str
    user_id: str


class OrganizerRequestResponse(BaseModel):
    request_id: UUID
    status: str
    