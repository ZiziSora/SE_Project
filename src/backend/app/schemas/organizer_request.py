from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enum import OrganizerRequestStatus


class OrganizerRequestAttachmentResponse(BaseModel):
    attachment_id: UUID
    url: str
    file_name: str


class OrganizerRequestResponse(BaseModel):
    request_id: UUID
    user_id: UUID
    full_name: str
    email: EmailStr
    avatar_url: str | None = None
    department_name: str | None = None
    organization_type: str | None = None
    reason: str | None = None
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


class OrganizerRequestDecisionResponse(BaseModel):
    message: str
    request: OrganizerRequestResponse
