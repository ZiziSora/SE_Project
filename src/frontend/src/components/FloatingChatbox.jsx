import { useState, useRef, useEffect } from 'react';

const initialMessages = [
  {
    id: 1,
    sender: 'ai',
    text: 'Chào bạn, tôi là trợ lý AI. Tôi có thể giúp gì cho bạn?',
  },
];

export default function FloatingChatbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;

    const userMsg = { id: Date.now(), sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponses = [
        'Tôi đã ghi nhận câu hỏi của bạn. Để biết thêm thông tin về sự kiện, bạn có thể xem tại trang Khám phá!',
        'Cảm ơn bạn đã liên hệ. Bạn muốn tôi giúp tìm kiếm sự kiện nào không?',
        'Tôi có thể giúp bạn tìm các sự kiện phù hợp với chuyên ngành và sở thích của bạn!',
        'Hãy cho tôi biết bạn quan tâm đến lĩnh vực nào, tôi sẽ gợi ý sự kiện phù hợp nhé!',
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: randomResponse },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[calc(100vw-3rem)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ height: '420px' }}
        >
          {/* Chat Header */}
          <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: '#6D28D9' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.5 2.122V21l-4.5-4.5M9.75 3.104A23.985 23.985 0 0112 3c.75 0 1.5.038 2.25.104" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">AI Assistant</p>
                <p className="text-purple-200 text-xs">Đang chờ bạn hỏi</p>
              </div>
            </div>
            <button
              id="chatbox-close"
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1 transition"
              aria-label="Đóng chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE9FE' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" style={{ color: '#6D28D9' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'text-white rounded-br-sm'
                      : 'bg-white text-gray-700 shadow-sm rounded-bl-sm border border-gray-100'
                  }`}
                  style={msg.sender === 'user' ? { backgroundColor: '#6D28D9' } : {}}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2 justify-start">
                <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE9FE' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" style={{ color: '#6D28D9' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: '#6D28D9', animationDelay: '0ms' }}></span>
                    <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: '#6D28D9', animationDelay: '150ms' }}></span>
                    <span className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: '#6D28D9', animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-3 py-3 bg-white border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
            <input
              id="chatbox-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
            />
            <button
              id="chatbox-send"
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="h-9 w-9 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition shadow-sm"
              style={{ backgroundColor: '#6D28D9' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#5B21B6'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#6D28D9'; }}
              aria-label="Gửi tin nhắn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        id="chatbox-toggle"
        onClick={() => setIsOpen((v) => !v)}
        className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90"
        style={{ backgroundColor: '#6D28D9', boxShadow: '0 4px 20px rgba(109,40,217,0.4)' }}
        aria-label="Mở chatbox AI"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
