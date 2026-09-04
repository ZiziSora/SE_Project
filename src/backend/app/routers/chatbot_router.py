"""Endpoint chatbox trợ lý AI (dùng ở trang Khám phá)."""
from typing import Optional

from fastapi import APIRouter, Depends
from supabase_auth.types import User

from app.core.security import get_current_user
from app.schemas.chatbot import ChatMessageIn, ChatMessageOut
from app.services import chatbot_service

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


@router.post("/messages", response_model=ChatMessageOut)
def post_chat_message(
    payload: ChatMessageIn,
    current_user: Optional[User] = Depends(get_current_user),
) -> ChatMessageOut:
    """Nhận câu hỏi của người dùng, trả về câu trả lời của trợ lý AI.

    Không bắt buộc đăng nhập; nếu có token hợp lệ thì `user_id` được truyền
    xuống service để phục vụ cá nhân hoá về sau.
    """
    user_id = current_user.id if current_user else None
    return chatbot_service.answer_chat_message(payload, user_id=user_id)
