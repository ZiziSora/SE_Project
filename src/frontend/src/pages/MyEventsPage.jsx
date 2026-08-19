import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Calendar } from "lucide-react";
import Toast from "../components/Toast";
import TabNavigation from "../components/TabNavigation";
import RegistrationEventCard from "../components/RegistrationEventCard";
import CancelModal from "../components/CancelModal";
import StudentHeader from "../components/common/StudentHeader.jsx";
import {
  cancelRegistration,
  getMyEvents,
} from "../api/registrationApi.js";

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState("Sắp diễn ra");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getMyEvents();
      setRegistrations(data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách sự kiện:", err);
      setError("Không thể tải danh sách sự kiện. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Tải danh sách lần đầu là chủ đích của effect khi trang được mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMyEvents();
  }, []);

  const canCancelRegistration = (startTimeStr) => {
    if (!startTimeStr) return false;
    const startTime = new Date(startTimeStr).getTime();
    const now = new Date().getTime();
    const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
    return startTime - now >= fiveDaysInMs;
  };

  const handleConfirmCancel = async () => {
    if (!selectedRegistration) return;

    if (!canCancelRegistration(selectedRegistration.events?.start_time)) {
      setToast({
        type: "error",
        message: "Không thể hủy đăng ký. Thời hạn hủy phải trước khi sự kiện diễn ra ít nhất 5 ngày.",
      });
      setSelectedRegistration(null);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    try {
      setIsCanceling(true);

      await cancelRegistration(
        selectedRegistration.registration_id,
      );

      setRegistrations((prev) =>
        prev.map((item) =>
          item.registration_id === selectedRegistration.registration_id
            ? { ...item, registration_status: "CANCELLED" }
            : item
        )
      );

      setToast({
        type: "success",
        message: `Đã hủy đăng ký thành công sự kiện "${selectedRegistration.events?.title || 'Sự kiện'}"`,
      });

      setSelectedRegistration(null);
    } catch (err) {
      console.error("Lỗi khi hủy đăng ký:", err);
      setToast({
        type: "error",
        message:
          err.response?.data?.detail ||
          err.message ||
          "Không thể hủy đăng ký. Vui lòng thử lại sau.",
      });
    } finally {
      setIsCanceling(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const formatEventDate = (startTimeStr, endTimeStr) => {
    if (!startTimeStr) {
      return { month: "THG --", day: "--", time: "Chưa cập nhật" };
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

  const getEffectiveStatus = (item) => {
    const rawStatus = (item.registration_status || "REGISTERED").toUpperCase();

    if (rawStatus === "CANCELLED") return "CANCELLED";
    if (rawStatus === "CHECKED_IN" || rawStatus === "ATTENDED" || rawStatus === "CHECK_IN") {
      return "ATTENDED";
    }
    if (rawStatus === "ABSENT") return "ABSENT";

    const event = item.events || {};
    const endTimeStr = event.end_time || event.start_time;
    if (endTimeStr) {
      const eventTime = new Date(endTimeStr).getTime();
      const now = new Date().getTime();
      if (now > eventTime) {
        return "ABSENT";
      }
    }

    return "REGISTERED";
  };

  const filteredRegistrations = registrations.filter((item) => {
    const status = getEffectiveStatus(item);
    if (activeTab === "Sắp diễn ra") return status === "REGISTERED";
    if (activeTab === "Đã tham gia") return status === "ATTENDED";
    if (activeTab === "Vắng mặt") return status === "ABSENT";
    if (activeTab === "Đã hủy") return status === "CANCELLED";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-900">
      <StudentHeader />
      <main className="relative min-h-[calc(100vh-72px)] px-6 py-10">
        <Toast toast={toast} />

        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Sự kiện của tôi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý lịch trình nghiên cứu và các buổi hội thảo học thuật của bạn.
          </p>

          <TabNavigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            registrations={registrations}
            getEffectiveStatus={getEffectiveStatus}
          />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
              <p className="text-sm font-medium">Đang tải danh sách sự kiện...</p>
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
              {filteredRegistrations.map((item) => (
                <RegistrationEventCard
                  key={item.registration_id}
                  item={item}
                  getEffectiveStatus={getEffectiveStatus}
                  canCancelRegistration={canCancelRegistration}
                  formatEventDate={formatEventDate}
                  onSelectCancel={setSelectedRegistration}
                />
              ))}
            </div>
          )}
        </div>

        <CancelModal
          selectedRegistration={selectedRegistration}
          onClose={() => setSelectedRegistration(null)}
          onConfirm={handleConfirmCancel}
          isCanceling={isCanceling}
          canCancelRegistration={canCancelRegistration}
          formatEventDate={formatEventDate}
        />
      </main>
    </div>
  );
}
