// src/components/Header.jsx
import React from 'react';
import { Search, Bell } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full bg-[#f8f9ff] px-8 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg shadow-purple-950/20">      {/* Khối bên trái: Logo & Thanh tìm kiếm & Navigation */}
      <div className="flex items-center space-x-8">
        {/* Logo */}
        <a 
          href="#" 
          className="text-2xl font-black text-[#6c38cc] tracking-tight"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          UniEvent
        </a>

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
          <a
            href="#"
            className="text-[#6c38cc] font-bold border-b-2 border-[#6c38cc] pb-0.5"
          >
            Khám phá
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-[#6c38cc] transition-colors"
          >
            Sự kiện
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-[#6c38cc] transition-colors"
          >
            Lịch sử
          </a>
        </nav>
      </div>

      {/* Khối bên phải: Thông báo & Avatar */}
      <div className="flex items-center space-x-5">
        {/* Nút chuông thông báo */}
        <button className="text-[#6c38cc] hover:opacity-80 transition-opacity p-1">
          <Bell className="w-6 h-6" />
        </button>

        {/* Avatar người dùng */}
        <div className="w-9 h-9 rounded-full bg-gray-300 overflow-hidden cursor-pointer">
          <div className="w-full h-full bg-gray-300" />
        </div>
      </div>
    </header>
  );
}