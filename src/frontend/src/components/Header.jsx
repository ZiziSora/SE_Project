// src/components/header.jsx
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  LoaderCircle,
  LogOut,
  Search,
  Settings2,
  UserRound,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { getMyProfile } from '../api/profileApi';
import { logoutCurrentSession } from '../utils/logoutSession';

export default function Header({ role = 'student' }) {
  const navigate = useNavigate();
  const accountMenuRef = useRef(null);
  const accountMenuTriggerRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isOrganizer = role === 'organizer';
  const profilePath = isOrganizer
    ? '/account/organizer/profile'
    : '/account/student/profile';

  useEffect(() => {
    let isMounted = true;

    getMyProfile()
      .then((profile) => {
        if (isMounted) {
          setAvatarUrl(profile.avatar_url || '');
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvatarUrl('');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
        accountMenuTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    const { logoutFailed } = await logoutCurrentSession();

    if (logoutFailed) {
      toast.warning(
        'Đã đăng xuất khỏi thiết bị này, nhưng không thể đồng bộ phiên với máy chủ.',
      );
    } else {
      toast.success('Đăng xuất thành công.');
    }

    navigate('/auth/login', { replace: true });
  };

  return (
    <header className="w-full bg-[#f8f9ff] px-8 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg shadow-purple-950/20">
      {/* Khối bên trái: Logo & Thanh tìm kiếm & Navigation */}
      <div className="flex items-center space-x-8">
        {/* Logo */}
        <Link
          to="/my-events"
          className="text-2xl font-black text-[#6c38cc] tracking-tight hover:opacity-90 transition-opacity"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          UniEvent
        </Link>

        {/* Ô tìm kiếm */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#a082e6] absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm"
            className="bg-[#ebe4ff] text-sm text-[#6c38cc] placeholder-[#b298f0] pl-9 pr-4 py-1.5 rounded-full outline-none w-64 focus:ring-2 focus:ring-[#6c38cc]/30 transition-all"
          />
        </div>

        {/* Menu điều hướng */}
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <NavLink
            to="/explore"
            className={({ isActive }) =>
              isActive
                ? "text-[#6c38cc] font-bold border-b-2 border-[#6c38cc] pb-0.5"
                : "text-gray-600 hover:text-[#6c38cc] transition-colors"
            }
          >
            Khám phá
          </NavLink>
          <NavLink
            to="/my-events"
            className={({ isActive }) =>
              isActive
                ? "text-[#6c38cc] font-bold border-b-2 border-[#6c38cc] pb-0.5"
                : "text-gray-600 hover:text-[#6c38cc] transition-colors"
            }
          >
            Sự kiện của tôi
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              isActive
                ? "text-[#6c38cc] font-bold border-b-2 border-[#6c38cc] pb-0.5"
                : "text-gray-600 hover:text-[#6c38cc] transition-colors"
            }
          >
            Lịch sử
          </NavLink>
        </nav>
      </div>

      {/* Khối bên phải: Thông báo & Avatar */}
      <div className="flex items-center space-x-5">
        {/* Nút chuông thông báo */}
        <button
          type="button"
          aria-label="Thông báo"
          className="text-[#6c38cc] hover:opacity-80 transition-opacity p-1"
        >
          <Bell className="w-6 h-6" />
        </button>

        {/* Avatar người dùng */}
        <div ref={accountMenuRef} className="relative">
          <button
            ref={accountMenuTriggerRef}
            type="button"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            aria-label={`Mở menu tài khoản ${isOrganizer ? 'Ban tổ chức' : 'sinh viên'}`}
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
            className="group flex cursor-pointer items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c38cc]"
          >
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#ebe4ff] text-[#6c38cc] ring-2 ring-[#ebe4ff] transition-transform duration-300 group-hover:scale-105">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`Ảnh đại diện ${isOrganizer ? 'Ban tổ chức' : 'sinh viên'}`}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarUrl('')}
                />
              ) : (
                <UserRound className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${isAccountMenuOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {isAccountMenuOpen && (
            <div
              role="menu"
              aria-label="Tùy chọn tài khoản"
              className="absolute top-full right-0 z-60 mt-3 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_18px_48px_rgba(41,24,75,0.18)]"
            >
              <Link
                to={profilePath}
                role="menuitem"
                onClick={() => setIsAccountMenuOpen(false)}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-800 transition-colors duration-300 hover:bg-[#f2edff] focus-visible:bg-[#f2edff] focus-visible:outline-none"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ebe4ff] text-[#6c38cc] transition-transform duration-300 group-hover:scale-105">
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                </span>
                Cài đặt tài khoản
              </Link>

              <div className="mx-3 my-1 h-px bg-gray-200" aria-hidden="true" />

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition-colors duration-300 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-700 transition-transform duration-300 group-hover:scale-105">
                  {isLoggingOut ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
