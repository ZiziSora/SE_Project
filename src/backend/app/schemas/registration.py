from typing import Optional

from pydantic import BaseModel


class RegistrationStatusOut(BaseModel):
    count: int
    capacity: Optional[int] = None
    registered: bool


class RegisterResponseOut(BaseModel):
    registered: bool = True
    already_registered: bool
    count: int
