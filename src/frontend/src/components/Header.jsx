import { useState, useRef, useEffect } from 'react';

const notifications = [
  {
    id: 1,
    title: 'Sự kiện mới: Hội thảo AI 2024',
    time: '2 phút trước',
    unread: true,
  },
  {
    id: 2,
    title: 'Đăng ký thành công: Ngày hội Việc làm',
    time: '1 giờ trước',
    unread: true,
  },
  {
    id: 3,
    title: 'Nhắc nhở: Workshop kỹ năng mềm vào ngày mai',
    time: '3 giờ trước',
    unread: false,
  },
];

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNav, setActiveNav] = useState('Khám phá');
  const dropdownRef = useRef(null);

  const navLinks = ['Khám phá', 'Sự kiện của tôi', 'Lịch sử'];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white sticky top-0 z-50" style={{ borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 24px' }}>
        <div className="flex items-center justify-between h-14 gap-4">

          {/* Left: Logo + Search */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <a href="/" className="text-2xl font-extrabold tracking-tight select-none" style={{ color: '#6D28D9' }}>
              UniEvent
            </a>
            <div className="relative hidden sm:block">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm"
                className="pl-9 pr-3 py-1.5 text-sm rounded-full border border-gray-200 bg-gray-50 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 w-40 transition"
              />
            </div>
          </div>

          {/* Center: Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link}
                onClick={() => setActiveNav(link)}
                className={`text-sm font-medium pb-0.5 transition-colors duration-200 ${
                  activeNav === link
                    ? 'border-b-2'
                    : 'text-gray-600 border-b-2 border-transparent'
                }`}
                style={activeNav === link ? { color: '#6D28D9', borderBottomColor: '#6D28D9' } : {}}
              >
                {link}
              </button>
            ))}
          </nav>

          {/* Right: Bell + Avatar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                id="notification-bell"
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 rounded-full text-gray-500 transition hover:bg-purple-50"
                style={{  }}
                onMouseEnter={e => e.currentTarget.style.color = '#6D28D9'}
                onMouseLeave={e => e.currentTarget.style.color = ''}
                aria-label="Thông báo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Unread dot */}
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              {/* Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 text-white rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in" style={{ backgroundColor: '#6D28D9' }}>
                  <div className="px-4 py-3 border-b border-purple-500 flex items-center justify-between">
                    <span className="font-semibold text-sm">Thông báo</span>
                    <span className="text-xs bg-purple-500 px-2 py-0.5 rounded-full">
                      {notifications.filter((n) => n.unread).length} mới
                    </span>
                  </div>
                  <ul>
                    {notifications.map((n, idx) => (
                      <li
                        key={n.id}
                        className={`px-4 py-3 cursor-pointer hover:bg-purple-500 transition ${
                          idx !== notifications.length - 1 ? 'border-b border-purple-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {n.unread && (
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 bg-yellow-300 rounded-full"></span>
                          )}
                          {!n.unread && <span className="mt-1.5 h-2 w-2 flex-shrink-0"></span>}
                          <div>
                            <p className="text-sm font-medium leading-snug">{n.title}</p>
                            <p className="text-xs text-purple-200 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="px-4 py-2 text-center">
                    <button className="text-xs text-purple-200 hover:text-white transition">
                      Xem tất cả thông báo →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div
              className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer transition"
              style={{  }}
              onMouseEnter={e => e.currentTarget.style.outline = '2px solid #6D28D9'}
              onMouseLeave={e => e.currentTarget.style.outline = ''}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
