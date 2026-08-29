// Lịch sử trò chuyện với chatbox AI được giữ trong suốt phiên đăng nhập
// (sống qua reload) và chỉ bị xoá khi người dùng đăng xuất — xem
// `clearStoredAuthentication()` trong utils/authStorage.js.

export const CHAT_HISTORY_KEY = "unievent_chat_history";

/** Đọc lịch sử đã lưu. Trả về null nếu chưa có / dữ liệu hỏng. */
export function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** Ghi đè lịch sử hiện tại. Bỏ qua lỗi quota / storage bị chặn. */
export function saveChatHistory(messages) {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  } catch {
    /* ignore */
  }
}

/** Xoá lịch sử trò chuyện (gọi khi đăng xuất). */
export function clearChatHistory() {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
