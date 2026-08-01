import React, { useState, useEffect } from "react";
import { Clock, MapPin, QrCode, AlertTriangle, X, Loader2, CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "./lib/supabase";

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState("Sắp diễn ra");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trạng thái cửa sổ xác nhận hủy đăng ký (Modal)
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch danh sách sự kiện từ Supabase
  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("event_registrations")
        .select(`
          registration_id,
          user_id,
          event_id,
          registration_status,
          created_at,
          events (
            event_id,
            title,
            description,
            location,
            start_time,
            end_time,
            registration_deadline,
            capacity,
            event_status,
            banner_url,
            event_categories (
              category_id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setRegistrations(data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách sự kiện:", err);
      setError("Không thể tải danh sách sự kiện. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
  }, []);

  // Xử lý hủy đăng ký sự kiện
  const handleConfirmCancel = async () => {
    if (!selectedRegistration) return;

    try {
      setIsCanceling(true);

      // Cập nhật trạng thái trong Supabase thành CANCELLED
      const { error: updateError } = await supabase
        .from("event_registrations")
        .update({ registration_status: "CANCELLED" })
        .eq("registration_id", selectedRegistration.registration_id);

      if (updateError) {
        throw updateError;
      }

      // Cập nhật state cục bộ
      setRegistrations((prev) =>
        prev.map((item) =>
          item.registration_id === selectedRegistration.registration_id
            ? { ...item, registration_status: "CANCELLED" }
            : item
        )
      );

      // Hiển thị thông báo thành công
      setToast({
        type: "success",
        message: `Đã hủy đăng ký thành công sự kiện "${selectedRegistration.events?.title || 'Sự kiện'}"`,
      });

      // Đóng modal
      setSelectedRegistration(null);
    } catch (err) {
      console.error("Lỗi khi hủy đăng ký:", err);
      setToast({
        type: "error",
        message: "Không thể hủy đăng ký. Vui lòng thử lại sau.",
      });
    } finally {
      setIsCanceling(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Hàm format thời gian và ngày tháng
  const formatEventDate = (startTimeStr, endTimeStr) => {
    if (!startTimeStr) {
      return {
        month: "THG --",
        day: "--",
        time: "Chưa cập nhật",
      };
    }

    const startDate = new Date(startTimeStr);
    const endDate = endTimeStr ? new Date(endTimeStr) : null;

    const monthNames = [
      "THG 1", "THG 2", "THG 3", "THG 4", "THG 5", "THG 6",
      "THG 7", "THG 8", "THG 9", "THG 10", "THG 11", "THG 12"
    ];

    const month = monthNames[startDate.getMonth()];
    const day = String(startDate.getDate()).padStart(2, "0");

    const formatTime = (d) =>
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    const time = endDate
      ? `${formatTime(startDate)} - ${formatTime(endDate)}`
      : formatTime(startDate);

    return { month, day, time };
  };

  // Lọc sự kiện theo Tab hiện tại
  const filteredRegistrations = registrations.filter((item) => {
    const status = item.registration_status || "REGISTERED";
    if (activeTab === "Sắp diễn ra") {
      return status === "REGISTERED";
    }
    if (activeTab === "Đã tham gia") {
      return status === "ATTENDED";
    }
    if (activeTab === "Vắng mặt") {
      return status === "ABSENT";
    }
    if (activeTab === "Đã hủy") {
      return status === "CANCELLED";
    }
    return true;
  });

  const defaultImage =
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80";

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f8f9fa] text-gray-900 px-6 py-10 font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all animate-bounce ${toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Tiêu đề & Mô tả */}
        <h1 className="text-3xl font-bold text-gray-900">Sự kiện của tôi</h1>
        <p className="text-gray-500 text-sm mt-1">
          Quản lý lịch trình nghiên cứu và các buổi hội thảo học thuật của bạn.
        </p>

        {/* Thanh lọc trạng thái (Tabs) */}
        <div className="inline-flex bg-[#f1f3f5] p-1 rounded-xl border border-gray-200 mt-6 gap-1 flex-wrap">
          {["Sắp diễn ra", "Đã tham gia", "Vắng mặt", "Đã hủy"].map((tab) => {
            const count = registrations.filter((item) => {
              const status = item.registration_status || "REGISTERED";
              if (tab === "Sắp diễn ra") return status === "REGISTERED";
              if (tab === "Đã tham gia") return status === "ATTENDED";
              if (tab === "Vắng mặt") return status === "ABSENT";
              if (tab === "Đã hủy") return status === "CANCELLED";
              return false;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === tab
                    ? "bg-white text-purple-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-200 text-gray-600"
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Nội dung danh sách sự kiện */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
            <p className="text-sm font-medium">Đang tải danh sách sự kiện từ Supabase...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mt-8 text-center text-red-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={fetchMyEvents}
              className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition"
            >
              Thử lại
            </button>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 mt-8 text-center text-gray-400 shadow-sm">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-bold text-gray-700">Chưa có sự kiện nào</h3>
            <p className="text-xs text-gray-500 mt-1">
              Bạn chưa có sự kiện nào ở mục "{activeTab}".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {filteredRegistrations.map((item) => {
              const event = item.events || {};
              const { month, day, time } = formatEventDate(event.start_time, event.end_time);
              const categoryName = event.event_categories?.name || "Hội thảo Học thuật";
              const banner = event.banner_url || defaultImage;
              const isCancelled = item.registration_status === "CANCELLED";

              return (
                <div
                  key={item.registration_id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between relative group"
                >
                  <div>
                    {/* Ảnh Banner & Badge Ngày */}
                    <div className="relative h-52 w-full bg-gray-100">
                      <img
                        src={banner}
                        alt={event.title || "Sự kiện"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = defaultImage;
                        }}
                      />

                      {/* Badge Ngày Tháng ở góc trên bên phải */}
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-center shadow-sm border border-gray-100">
                        <span className="block text-[10px] font-bold text-red-500 uppercase tracking-wider">
                          {month}
                        </span>
                        <span className="block text-base font-black text-gray-900 leading-none">
                          {day}
                        </span>
                      </div>
                    </div>

                    {/* Thông tin sự kiện */}
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-block bg-[#f3e8ff] text-[#7e22ce] text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                          {categoryName}
                        </span>

                        {isCancelled && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Đã hủy đăng ký
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-gray-900 leading-snug line-clamp-2 min-h-[2.75rem]">
                        {event.title || "Tên sự kiện chưa cập nhật"}
                      </h3>

                      <div className="mt-4 space-y-1.5 text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{event.location || "Địa điểm chưa xác định"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nút Xem QR Check-in & Nút Hủy dưới chân card */}
                  <div className="p-5 pt-0 flex items-center gap-2">
                    <button
                      disabled={isCancelled}
                      className={`w-full text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-sm ${isCancelled
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                          : "bg-[#6D28D9] hover:bg-[#7E22CE] text-white active:scale-[0.99]"
                        }`}
                    >
                      <QrCode className="w-4 h-4" />
                      {isCancelled ? "Đã hủy đăng ký" : "Xem QR Check-in"}
                    </button>

                    {!isCancelled && (
                      <button
                        onClick={() => setSelectedRegistration(item)}
                        title="Hủy đăng ký"
                        className="px-3 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl transition text-xs font-semibold flex items-center gap-1 shrink-0 active:scale-[0.98]"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CỬA SỔ POPUP XÁC NHẬN HỦY ĐĂNG KÝ (MODAL) */}
      {selectedRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng X */}
            <button
              onClick={() => !isCanceling && setSelectedRegistration(null)}
              disabled={isCanceling}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon cảnh báo */}
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            {/* Nội dung xác nhận */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">
                Xác nhận hủy đăng ký sự kiện
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                Bạn có chắc chắn muốn hủy đăng ký tham gia sự kiện dưới đây không?
              </p>

              {/* Thẻ thông tin sự kiện trong Modal */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mt-4 text-left">
                <span className="inline-block bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md mb-1.5">
                  {selectedRegistration.events?.event_categories?.name || "Sự kiện"}
                </span>
                <h4 className="font-bold text-sm text-gray-900 line-clamp-2">
                  {selectedRegistration.events?.title || "Sự kiện học thuật"}
                </h4>
                <div className="mt-2 text-[11px] text-gray-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>
                      {formatEventDate(
                        selectedRegistration.events?.start_time,
                        selectedRegistration.events?.end_time
                      ).time}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span>{selectedRegistration.events?.location || "Chưa cập nhật"}</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-red-500 font-medium mt-3">
                * Lưu ý: Thao tác này sẽ cập nhật trạng thái hủy và ghế của bạn có thể được chuyển cho sinh viên khác.
              </p>
            </div>

            {/* Các nút hành động trong Modal */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setSelectedRegistration(null)}
                disabled={isCanceling}
                className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-50"
              >
                Bỏ qua
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCanceling}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm disabled:opacity-50"
              >
                {isCanceling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Xác nhận hủy</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}