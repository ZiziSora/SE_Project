import api from "./axios";

/**
 * Gửi một tin nhắn của người dùng tới trợ lý AI và nhận câu trả lời.
 *
 * @param {Object} params
 * @param {string} params.message - Câu hỏi hiện tại của người dùng.
 * @param {Array<{role: 'user'|'ai', text: string}>} [params.history]
 *        Vài lượt hội thoại gần nhất để giữ ngữ cảnh (không bắt buộc).
 * @returns {Promise<{reply: string, in_scope: boolean, events: Array}>}
 */
export const sendChatMessage = async ({ message, history = [] }) => {
  const response = await api.post("/api/chatbot/messages", {
    message,
    history,
  });
  return response.data;
};
