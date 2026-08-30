"""Quy ước múi giờ dùng chung cho toàn hệ thống.

Các cột `start_time`, `end_time`, `registration_deadline` trong DB là
`timestamp` KHÔNG timezone, và form của Organizer ghi xuống đúng giờ đồng hồ
mà người dùng nhìn thấy (giờ Việt Nam). Vì vậy mọi phép so sánh với "bây giờ"
cũng phải lấy giờ Việt Nam, không phải giờ UTC — trước đây dùng UTC nên trạng
thái sự kiện bị trễ đúng 7 tiếng (sự kiện kết thúc 17:30 vẫn hiện "Đang diễn
ra" cho tới 00:30 hôm sau).

Việt Nam không có giờ mùa hè nên dùng offset cố định +07:00, tránh phụ thuộc
gói `tzdata` (không có sẵn trên Windows).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

APP_TZ = timezone(timedelta(hours=7), "Asia/Ho_Chi_Minh")


def now_local() -> datetime:
    """Giờ hiện tại có timezone, theo múi giờ ứng dụng."""
    return datetime.now(APP_TZ)


def now_naive_local() -> datetime:
    """Giờ hiện tại dạng naive — cùng hệ quy chiếu với giá trị lưu trong DB."""
    return now_local().replace(tzinfo=None)


def as_local(dt: Optional[datetime]) -> Optional[datetime]:
    """Gắn múi giờ ứng dụng cho giá trị naive (naive = giờ VN theo quy ước)."""
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=APP_TZ)
    return dt
