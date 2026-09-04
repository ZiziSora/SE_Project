from typing import Optional

from pydantic import BaseModel


class RegistrationStatusOut(BaseModel):
    count: int
    capacity: Optional[int] = None
    registered: bool
    status: Optional[str] = None


class RegisterResponseOut(BaseModel):
    registered: bool = True
    already_registered: bool
    count: int
    is_waitlisted: bool = False
    registration_status: str = "REGISTERED"
