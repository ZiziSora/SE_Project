import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  GraduationCap,
  MessageCircle,
  RotateCcw,
  SendHorizontal,
  User,
  X,
} from 'lucide-react';

import { getMyProfile } from '../api/profileApi.js';
import { sendChatMessage } from '../api/chatbotApi.js';
import { loadChatHistory, saveChatHistory } from '../lib/chatHistory.js';

const PRIMARY = '#6D28D9';
const PRIMARY_SOFT = '#EDE9FE';
const HEADER_GRADIENT = 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)';

const fmtTime = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// Định dạng thời gian sự kiện cho thẻ đính kèm dưới câu trả lời của trợ lý.
const fmtEventDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const HISTORY_LIMIT = 10;
const ERROR_REPLY =
  'Xin lỗi, mình đang gặp sự cố kết nối. Bạn thử lại sau giây lát nhé.';

const buildInitialMessages = () => [
  {
    id: 1,
    sender: 'ai',
    text: 'Chào bạn, tôi là trợ lý AI của UniEvent. Tôi có thể giúp gì cho bạn?',
    time: fmtTime(),
  },
];

const QUICK_REPLIES = [
  'Sự kiện sắp diễn ra',
  'Gợi ý sự kiện theo khoa của tôi',
  'Sự kiện đang mở đăng ký',
];

// Các trạng thái hiển thị dưới tên "AI Assistant".
// Có thể bổ sung thêm: away (Vắng mặt), offline (Ngoại tuyến),
// error (Mất kết nối), reconnecting (Đang kết nối lại)...
const STATUS_CONFIG = {
  connecting: { label: 'Đang kết nối…', dotClass: 'bg-amber-400', pulse: true },
  online: { label: 'Trực tuyến', dotClass: 'bg-emerald-400', pulse: false },
  typing: { label: 'Đang soạn tin…', dotClass: 'bg-amber-400', pulse: true },
};

const WIDGET_STYLES = `
  @keyframes fcb-pop {
    from { opacity: 0; transform: translateY(14px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes fcb-row {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fcb-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  .fcb-panel { animation: fcb-pop 0.24s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: bottom right; }
  .fcb-row { animation: fcb-row 0.24s ease-out; }
  .fcb-fab-idle { animation: fcb-float 3s ease-in-out infinite; }
  .fcb-scroll::-webkit-scrollbar { width: 6px; }
  .fcb-scroll::-webkit-scrollbar-thumb { background: rgba(109, 40, 217, 0.22); border-radius: 9999px; }
  .fcb-scroll::-webkit-scrollbar-track { background: transparent; }
  @media (prefers-reduced-motion: reduce) {
    .fcb-panel, .fcb-row, .fcb-fab-idle { animation: none !important; }
  }
`;

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return (parts[parts.length - 1][0] || '').toUpperCase();
}

export default function FloatingChatbox() {
  const [isOpen, setIsOpen] = useState(false);
  // Khôi phục lịch sử trò chuyện của phiên đăng nhập hiện tại (nếu có).
  const [messages, setMessages] = useState(
    () => loadChatHistory() || buildInitialMessages(),
  );
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [userAvatarUrl, setUserAvatarUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const connectTimerRef = useRef(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const statusKey = isConnecting ? 'connecting' : isTyping ? 'typing' : 'online';
  const status = STATUS_CONFIG[statusKey];
  const userInitials = getInitials(userName);
  const showUserAvatar = Boolean(userAvatarUrl) && !avatarFailed;
  const showQuickReplies = messages.length === 1 && !isTyping;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Lưu lịch sử trò chuyện của phiên đăng nhập (xoá khi đăng xuất — authStorage.js).
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Ảnh đại diện người dùng hiện tại (dùng cho bong bóng chat bên phải).
  useEffect(() => {
    let isMounted = true;

    getMyProfile()
      .then((profile) => {
        if (!isMounted) return;
        setUserAvatarUrl(profile.avatar_url || '');
        setUserName(profile.full_name || '');
      })
      .catch(() => {
        if (isMounted) setUserAvatarUrl('');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => () => clearTimeout(connectTimerRef.current), []);

  const toggleOpen = () => {
    const willOpen = !isOpen;
    clearTimeout(connectTimerRef.current);
    setIsOpen(willOpen);

    if (willOpen) {
      setHasUnread(false);
      // Trạng thái "Đang kết nối…" trong khoảnh khắc mở chatbox.
      setIsConnecting(true);
      connectTimerRef.current = setTimeout(() => setIsConnecting(false), 700);
    } else {
      setIsConnecting(false);
    }
  };

  const resetConversation = () => {
    setMessages(buildInitialMessages());
    setIsTyping(false);
    setInputValue('');
    setInputError('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const autoGrow = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  };

  const sendText = async (raw) => {
    const text = raw.trim();

    // Câu hỏi rỗng / chỉ có khoảng trắng: KHÔNG gọi API, yêu cầu nhập lại.
    if (!text) {
      setInputError('Vui lòng nhập câu hỏi trước khi gửi.');
      inputRef.current?.focus();
      return;
    }
    // Chặn gửi khi đang chờ trả lời để tránh gọi API chồng nhau.
    if (isTyping) return;
    setInputError('');

    // Lịch sử gửi kèm là các lượt TRƯỚC tin nhắn mới (giới hạn HISTORY_LIMIT lượt).
    const history = messages
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'ai', text: m.text }));

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text, time: fmtTime() },
    ]);
    setInputValue('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      const data = await sendChatMessage({ message: text, history });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: data.reply,
          time: fmtTime(),
          events: Array.isArray(data.events) ? data.events : [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: ERROR_REPLY,
          time: fmtTime(),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
      if (!isOpenRef.current) setHasUnread(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText(inputValue);
    }
  };

  const renderUserAvatar = () => (
    <div className="h-6 w-6 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center bg-purple-100 text-[10px] font-semibold text-purple-700 ring-1 ring-purple-200">
      {showUserAvatar ? (
        <img
          src={userAvatarUrl}
          alt="Ảnh đại diện của bạn"
          className="h-full w-full object-cover"
          onError={() => setAvatarFailed(true)}
        />
      ) : userInitials ? (
        <span>{userInitials}</span>
      ) : (
        <User className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </div>
  );

  const renderAiAvatar = () => (
    <div
      className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: PRIMARY_SOFT }}
    >
      <GraduationCap className="h-3.5 w-3.5" style={{ color: PRIMARY }} aria-hidden="true" />
    </div>
  );

  const avatarSpacer = <div className="w-6 flex-shrink-0" aria-hidden="true" />;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <style>{WIDGET_STYLES}</style>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fcb-panel w-[calc(100vw-3rem)] sm:w-[22.5rem] bg-white rounded-[20px] shadow-[0_24px_60px_-12px_rgba(76,29,149,0.35)] ring-1 ring-black/5 flex flex-col overflow-hidden"
          style={{ height: 'min(70vh, 460px)' }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between flex-shrink-0 text-white"
            style={{ background: HEADER_GRADIENT }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="h-9 w-9 bg-white/15 backdrop-blur rounded-full flex items-center justify-center ring-1 ring-white/25">
                  <GraduationCap className="h-[18px] w-[18px] text-white" aria-hidden="true" />
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#7126d9] ${status.dotClass} ${
                    status.pulse ? 'animate-pulse' : ''
                  }`}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight truncate">AI Assistant</p>
                <p className="text-white/75 text-xs leading-tight">{status.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={resetConversation}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition"
                aria-label="Bắt đầu hội thoại mới"
                title="Bắt đầu hội thoại mới"
              >
                <RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <button
                id="chatbox-close"
                onClick={toggleOpen}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition"
                aria-label="Đóng chat"
              >
                <X className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="fcb-scroll flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex justify-center pb-3">
              <span className="text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
                Hôm nay
              </span>
            </div>

            {messages.map((msg, i) => {
              const isUser = msg.sender === 'user';
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const groupedTop = prev && prev.sender === msg.sender;
              const groupedBottom = next && next.sender === msg.sender;

              return (
                <div
                  key={msg.id}
                  className={`fcb-row flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${
                    groupedTop ? 'mt-1' : 'mt-3'
                  }`}
                >
                  {!isUser && (groupedTop ? avatarSpacer : renderAiAvatar())}

                  <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'text-white rounded-2xl rounded-br-md'
                          : 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-100 rounded-2xl rounded-bl-md'
                      }`}
                      style={isUser ? { backgroundColor: PRIMARY } : undefined}
                    >
                      {msg.text}
                    </div>

                    {/* Thẻ sự kiện đính kèm câu trả lời của trợ lý (lấy từ database).
                        Bấm vào để mở trang chi tiết sự kiện. */}
                    {!isUser && msg.events?.length > 0 && (
                      <div className="mt-1 flex w-full flex-col gap-1.5">
                        {msg.events.map((ev) => (
                          <Link
                            key={ev.event_id}
                            to={`/events/${ev.event_id}`}
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-gray-100 transition hover:ring-purple-300 hover:bg-purple-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold leading-snug text-gray-800 group-hover:text-purple-700">
                                {ev.title || 'Sự kiện'}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-gray-500">
                                {[
                                  ev.category_name,
                                  fmtEventDate(ev.start_time),
                                  ev.location,
                                ]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </p>
                            </div>
                            <ChevronRight
                              className="h-4 w-4 flex-shrink-0 text-gray-300 transition group-hover:text-purple-500"
                              aria-hidden="true"
                            />
                          </Link>
                        ))}
                      </div>
                    )}

                    {!groupedBottom && (msg.time || !isUser) && (
                      <span className="flex items-center gap-1 px-1 text-[10px] text-gray-400">
                        {msg.time}
                        {!isUser && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-50 px-1.5 py-px font-medium text-purple-500 ring-1 ring-purple-100">
                            <GraduationCap className="h-2.5 w-2.5" aria-hidden="true" />
                            Nội dung do AI tạo
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {isUser && (groupedTop ? avatarSpacer : renderUserAvatar())}
                </div>
              );
            })}

            {/* Quick replies */}
            {showQuickReplies && (
              <div className="mt-3 flex flex-wrap gap-2 pl-8">
                {QUICK_REPLIES.map((label) => (
                  <button
                    key={label}
                    onClick={() => sendText(label)}
                    className="text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 ring-1 ring-purple-200 rounded-full px-3 py-1.5 transition"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="fcb-row flex items-end gap-2 justify-start mt-3">
                {renderAiAvatar()}
                <div className="bg-white ring-1 ring-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: PRIMARY, animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: PRIMARY, animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: PRIMARY, animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pt-2.5 pb-3 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 transition focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-200">
              <textarea
                id="chatbox-input"
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (inputError) setInputError('');
                  autoGrow();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn..."
                aria-invalid={Boolean(inputError)}
                className="flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none max-h-24 leading-relaxed"
              />
              <button
                id="chatbox-send"
                onClick={() => sendText(inputValue)}
                disabled={isTyping}
                className="mb-0.5 h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center text-white transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: HEADER_GRADIENT }}
                aria-label="Gửi tin nhắn"
              >
                <SendHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {inputError ? (
              <p
                role="alert"
                className="mt-1.5 text-center text-[11px] font-medium text-red-500"
              >
                {inputError}
              </p>
            ) : (
              <p className="mt-1.5 text-center text-[10px] text-gray-300">
                Trợ lý AI • Shift + Enter để xuống dòng
              </p>
            )}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        id="chatbox-toggle"
        onClick={toggleOpen}
        className={`relative h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-transform duration-300 hover:scale-110 active:scale-90 ${
          isOpen ? '' : 'fcb-fab-idle'
        }`}
        style={{ background: HEADER_GRADIENT, boxShadow: '0 8px 26px rgba(109,40,217,0.45)' }}
        aria-label={isOpen ? 'Đóng chatbox AI' : 'Mở chatbox AI'}
      >
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          }`}
        >
          <MessageCircle className="h-6 w-6 text-white" aria-hidden="true" />
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          }`}
        >
          <X className="h-6 w-6 text-white" aria-hidden="true" />
        </span>
        {!isOpen && hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white" />
          </span>
        )}
      </button>
    </div>
  );
}
