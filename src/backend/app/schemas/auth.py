from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: str

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class SignUpResponse(BaseModel):
    message: str
    user_id: str