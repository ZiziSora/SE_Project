"""Schema cho tính năng chatbox trợ lý AI (trang Khám phá).

Luồng: frontend gửi câu hỏi hiện tại + vài lượt hội thoại gần nhất, backend
trả về câu trả lời đã được kiểm soát phạm vi và danh sách sự kiện liên quan
(lấy từ database, không để LLM bịa).
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, Field, StringConstraints

# Chuỗi đã cắt khoảng trắng 2 đầu; rỗng (hoặc chỉ toàn khoảng trắng) -> 422.
NonEmptyText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)
]


class ChatTurn(BaseModel):
    """Một lượt hội thoại trước đó, do frontend gửi kèm để giữ ngữ cảnh."""

    role: Literal["user", "ai"]
    text: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)
    ]


class ChatMessageIn(BaseModel):
    message: NonEmptyText
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)


class ChatEventOut(BaseModel):
    """Thẻ sự kiện rút gọn, hiển thị kèm câu trả lời của trợ lý."""

    event_id: str
    title: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    registration_deadline: Optional[datetime] = None
    category_name: Optional[str] = None


class ChatMessageOut(BaseModel):
    reply: str
    # false khi câu hỏi nằm ngoài phạm vi hỗ trợ (sự kiện UniEvent).
    in_scope: bool = True
    events: list[ChatEventOut] = Field(default_factory=list)
