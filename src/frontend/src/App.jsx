import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/header.jsx";
import MyEventsPage from "./MyEventsPage.jsx";

function PlaceholderPage({ title, description }) {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f8f9fa] text-gray-900 px-6 py-16 text-center font-sans">
      <div className="max-w-md mx-auto bg-white border border-gray-100 rounded-3xl p-10 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500 mt-2">{description}</p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        {/* Route chính dẫn tới trang Sự kiện của tôi */}
        <Route path="/" element={<Navigate to="/my-events" replace />} />
        <Route path="/my-events" element={<MyEventsPage />} />

        {/* Các Route bổ sung */}
        <Route
          path="/explore"
          element={
            <PlaceholderPage
              title="Khám phá Sự kiện"
              description="Tính năng khám phá các sự kiện mới đang được phát triển."
            />
          }
        />
        <Route
          path="/history"
          element={
            <PlaceholderPage
              title="Lịch sử Tham gia"
              description="Trang xem lại lịch sử các sự kiện bạn đã hoàn thành."
            />
          }
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/my-events" replace />} />
      </Routes>
    </>
  );
}
