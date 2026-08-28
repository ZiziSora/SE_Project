from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CheckinRequest(BaseModel):
    event_id: Optional[UUID] = Field(
        None,
        description="ID của sự kiện (tùy chọn, dùng để xác thực vé thuộc đúng sự kiện)",
    )
    code: str = Field(
        ...,
        description="Chuỗi QR token hoặc Mã dự phòng thủ công (manual_code)",
        min_length=1,
    )


class ParticipantInfo(BaseModel):
    user_id: UUID
    full_name: Optional[str] = None
    email: str
    student_code: Optional[str] = None
    contact_phone: Optional[str] = None
    avatar_url: Optional[str] = None


class CheckinEventInfo(BaseModel):
    event_id: UUID
    title: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None


class CheckinSuccessResponse(BaseModel):
    success: bool = True
    message: str = "Check-in thành công"
    participant: ParticipantInfo
    event: CheckinEventInfo
    checked_in_at: datetime
    registration_status: str = "CHECKED_IN"


class QRDetailResponse(BaseModel):
    registration_id: UUID
    event_id: UUID
    event_title: Optional[str] = None
    qr_token: str
    manual_code: str
    created_at: datetime
    expired_at: Optional[datetime] = None
    registration_status: str
    checked_in_at: Optional[datetime] = None


class ParticipantCheckinStatus(BaseModel):
    registration_id: UUID
    user_id: UUID
    full_name: Optional[str] = None
    email: str
    student_code: Optional[str] = None
    registration_status: str
    checked_in_at: Optional[datetime] = None
    created_at: datetime


class EventCheckinStatsResponse(BaseModel):
    event_id: UUID
    title: str
    capacity: Optional[int] = None
    total_registered: int
    total_checked_in: int
    participants: List[ParticipantCheckinStatus] = []
