import React, { useState } from "react";
import { Clock, MapPin, QrCode } from "lucide-react";

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState("Sắp diễn ra");

  // Dữ liệu mẫu (sau này sẽ kết nối fetch từ Supabase)
  const events = [
    {
      id: "1",
      title: "Tương lai của AI trong Phân tích Dữ liệu Học thuật",
      type: "Hội thảo Quốc tế",
      month: "THG 11",
      day: "15",
      time: "08:30 AM - 12:00 PM",
      location: "Hội trường A1, Cơ sở Chính",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "2",
      title: "Phương pháp Nghiên cứu Định lượng Nâng cao",
      type: "Workshop",
      month: "THG 11",
      day: "22",
      time: "14:00 PM - 17:00 PM",
      location: "Phòng Lab B302",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f8f9fa] text-gray-900 px-6 py-10 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Tiêu đề & Mô tả */}
        <h1 className="text-3xl font-bold text-gray-900">Sự kiện của tôi</h1>
        <p className="text-gray-500 text-sm mt-1">
          Quản lý lịch trình nghiên cứu và các buổi hội thảo học thuật của bạn.
        </p>

        {/* Thanh lọc trạng thái (Tabs) */}
        <div className="inline-flex bg-[#f1f3f5] p-1 rounded-xl border border-gray-200 mt-6 gap-1">
          {["Sắp diễn ra", "Đã tham gia", "Vắng mặt"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === tab
                ? "bg-white text-purple-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Danh sách thẻ sự kiện (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Ảnh Banner & Badge Ngày Tháng */}
                <div className="relative h-52 w-full">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Badge Lịch góc phải */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-center shadow-sm border border-gray-100">
                    <span className="block text-[10px] font-bold text-red-500 uppercase tracking-wider">
                      {event.month}
                    </span>
                    <span className="block text-base font-black text-gray-900 leading-none">
                      {event.day}
                    </span>
                  </div>
                </div>

                {/* Thông tin sự kiện */}
                <div className="p-5">
                  <span className="inline-block bg-[#f3e8ff] text-[#7e22ce] text-[11px] font-semibold px-2.5 py-0.5 rounded-md mb-3">
                    {event.type}
                  </span>

                  <h3 className="font-bold text-base text-gray-900 leading-snug line-clamp-2 min-h-[2.75rem]">
                    {event.title}
                  </h3>

                  <div className="mt-4 space-y-1.5 text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nút Xem QR Check-in */}
              <div className="p-5 pt-0">
                <button className="w-full bg-[#6D28D9] hover:bg-[#7E22CE] text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-sm active:scale-[0.99]">
                  <QrCode className="w-4 h-4" />
                  Xem QR Check-in
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}