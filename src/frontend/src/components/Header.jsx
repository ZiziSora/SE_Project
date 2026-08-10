// src/components/header.jsx
import { useEffect, useState } from 'react';
import { Search, Bell, UserRound } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

import { getMyProfile } from '../api/profileApi';

export default function Header() {
  const [avatarUrl, setAvatarUrl] = useState('');

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
        <button className="text-[#6c38cc] hover:opacity-80 transition-opacity p-1">
          <Bell className="w-6 h-6" />
        </button>

        {/* Avatar người dùng */}
        <Link
          to="/account/student/profile"
          aria-label="Mở trang hồ sơ sinh viên"
          title="Hồ sơ cá nhân"
          className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gray-200 text-gray-500 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c38cc]"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Ảnh đại diện sinh viên"
              className="h-full w-full object-cover"
              onError={() => setAvatarUrl('')}
            />
          ) : (
            <UserRound className="h-5 w-5" aria-hidden="true" />
          )}
        </Link>
      </div>
    </header>
  );
}
