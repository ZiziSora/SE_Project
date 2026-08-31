from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.enum import OrganizerRequestStatus


class OrganizerRequestAttachmentResponse(BaseModel):
    attachment_id: UUID
    url: str
    file_name: str


class OrganizerRequestResponse(BaseModel):
    request_id: UUID
    previous_request_id: UUID | None = None
    user_id: UUID
    full_name: str
    email: EmailStr
    avatar_url: str | None = None
    department_name: str | None = None
    organization_type: str | None = None
    reason: str | None = None
    rejected_reason: str | None = None
    status: OrganizerRequestStatus
    submitted_at: datetime
    reviewed_by: UUID | None = None
    attachments: list[OrganizerRequestAttachmentResponse] = Field(
        default_factory=list,
    )


class OrganizerRequestSummaryResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int


class OrganizerRequestListResponse(BaseModel):
    items: list[OrganizerRequestResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    summary: OrganizerRequestSummaryResponse


class OrganizerRequestDecisionRequest(BaseModel):
    status: Literal["approved", "rejected"]
    reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def require_rejection_reason(self):
        if self.status == "rejected" and not (self.reason or "").strip():
            raise ValueError("Vui lòng nhập lý do từ chối.")
        return self


class OrganizerRequestDecisionResponse(BaseModel):
    message: str
    request: OrganizerRequestResponse
