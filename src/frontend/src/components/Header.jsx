import { useState, useRef, useEffect } from 'react';

const notifications = [
  // ... (Giữ nguyên mảng notifications của bạn)
  { id: 1, title: 'Sự kiện mới: Hội thảo AI 2024', time: '2 phút trước', unread: true },
  { id: 2, title: 'Đăng ký thành công: Ngày hội Việc làm', time: '1 giờ trước', unread: true },
  { id: 3, title: 'Nhắc nhở: Workshop kỹ năng mềm vào ngày mai', time: '3 giờ trước', unread: false },
];

// Thêm prop "role" vào đây, mặc định là 'student'
export default function Header({ role = 'student' }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState(role === 'organizer' ? 'Trang chủ' : 'Khám phá');
  const dropdownRef = useRef(null);

  // LOGIC ĐỔI MENU THEO ROLE
  const navLinks = role === 'organizer'
    ? ['Trang chủ', 'Dashboard', 'Quản lý người tham gia']
    : ['Khám phá', 'Sự kiện của tôi', 'Lịch sử'];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
      {/* ... (GIỮ NGUYÊN HOÀN TOÀN TẤT CẢ CODE HTML GIAO DIỆN BÊN DƯỚI CỦA BẠN) ... */}
      <div className="w-full mx-auto px-4 md:px-8 lg:px-20">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">

          {/* Left: Logo + Search */}
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            <a href="/" className="text-xl sm:text-2xl font-extrabold tracking-tight select-none flex-shrink-0" style={{ color: '#6D28D9' }}>
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
                className="pl-9 pr-3 py-1.5 text-sm rounded-full border border-gray-200 bg-gray-50 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 w-32 md:w-40 transition"
              />
            </div>
          </div>

          {/* Center: Nav links (desktop/tablet only) */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link}
                onClick={() => setActiveNav(link)}
                className={`text-sm font-medium pb-0.5 transition-colors duration-200 whitespace-nowrap ${activeNav === link
                  ? 'border-b-2'
                  : 'text-gray-600 border-b-2 border-transparent'
                  }`}
                style={activeNav === link ? { color: '#6D28D9', borderBottomColor: '#6D28D9' } : {}}
              >
                {link}
              </button>
            ))}
          </nav>

          {/* Right: Hamburger (mobile) + Bell + Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-full text-gray-500 transition hover:bg-purple-50 hover:text-[#6D28D9]"
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* (Phần chuông thông báo và avatar giữ nguyên như file cũ của bạn) */}
            <div className="relative" ref={dropdownRef}>
              <div className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 pt-1 flex flex-col gap-3 border-t border-gray-100">
            <nav className="flex flex-col gap-1 pt-1">
              {navLinks.map((link) => (
                <button
                  key={link}
                  onClick={() => {
                    setActiveNav(link);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-sm font-medium text-left px-3 py-2.5 rounded-lg transition-colors duration-200 ${activeNav === link ? 'bg-purple-50' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  style={activeNav === link ? { color: '#6D28D9' } : {}}
                >
                  {link}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}