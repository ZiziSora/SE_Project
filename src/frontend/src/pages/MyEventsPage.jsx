import { useState, useEffect } from "react";
import { AlertTriangle, Bookmark, Calendar, Loader2 } from "lucide-react";
import Toast from "../components/Toast.jsx";
import TabNavigation from "../components/TabNavigation.jsx";
import RegistrationEventCard from "../components/RegistrationEventCard.jsx";
import EventCard from "../components/EventCard.jsx";
import CancelModal from "../components/CancelModal.jsx";
import StudentHeader from "../components/common/StudentHeader.jsx";
import { publicEventApi } from "../api/eventApi.js";
import {
  cancelRegistration,
  getMyEvents,
} from "../api/registrationApi.js";

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState("Sắp diễn ra");
  const [registrations, setRegistrations] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [toast, setToast] = useState(null);

  const isEventExpired = (event) => {
    if (!event) return true;
    const now = new Date().getTime();
    const deadlineStr = event.registration_deadline || event.start_time;
    if (!deadlineStr) return false;
    const cutoffTime = new Date(deadlineStr).getTime();
    if (Number.isNaN(cutoffTime)) return false;
    return cutoffTime < now;
  };

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const [registrationData, savedEventData] = await Promise.all([
        getMyEvents(),
        publicEventApi.listSavedEvents(),
      ]);
      setRegistrations(registrationData || []);
      const validSaved = (savedEventData || []).filter(
        (item) => item.events && !isEventExpired(item.events)
      );
      setSavedEvents(validSaved);
    } catch (err) {
      console.error("Lỗi khi tải danh sách sự kiện:", err);
      setError("Không thể tải danh sách sự kiện. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveEvent = async (eventId) => {
    try {
      await publicEventApi.unsaveEvent(eventId);
      setSavedEvents((prev) => prev.filter((item) => item.event_id !== eventId));
      setToast({
        type: "success",
        message: "Đã bỏ lưu sự kiện thành công.",
      });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("Lỗi khi bỏ lưu sự kiện:", err);
      setToast({
        type: "error",
        message:
          err.response?.data?.detail ||
          err.message ||
          "Không thể bỏ lưu sự kiện. Vui lòng thử lại sau.",
      });
      setTimeout(() => setToast(null), 4000);
    }
  };

  useEffect(() => {
    // Tải danh sách lần đầu là chủ đích của effect khi trang được mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMyEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      return { fullDateTime: "Thời gian chưa cập nhật", month: "THG --", day: "--", time: "Chưa cập nhật" };
    }

    const startDate = new Date(startTimeStr);
    if (Number.isNaN(startDate.getTime())) {
      return { fullDateTime: "Thời gian chưa cập nhật", month: "THG --", day: "--", time: "Chưa cập nhật" };
    }

    const endDate = endTimeStr ? new Date(endTimeStr) : null;

    const day = String(startDate.getDate()).padStart(2, "0");
    const month = startDate.getMonth() + 1;
    const year = startDate.getFullYear();

    const formatTime = (d) =>
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    const timeStr = endDate && !Number.isNaN(endDate.getTime())
      ? `${formatTime(startDate)} - ${formatTime(endDate)}`
      : formatTime(startDate);

    const fullDateTime = `${timeStr}, ${day} Tháng ${month}, ${year}`;

    return { fullDateTime, month: `THG ${month}`, day, time: timeStr };
  };

  const getEffectiveStatus = (item) => {
    const rawStatus = (item.registration_status || "REGISTERED").toUpperCase();

    if (rawStatus === "CANCELLED") return "CANCELLED";
    if (rawStatus === "WAITLISTED" || rawStatus === "WAITLIST") return "WAITLISTED";
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

  const formatSavedEventDate = (startTimeStr, endTimeStr) => {
    if (!startTimeStr) return "Thời gian chưa được cập nhật";
    const { fullDateTime } = formatEventDate(startTimeStr, endTimeStr);
    return fullDateTime;
  };

  const filteredRegistrations = registrations.filter((item) => {
    const status = getEffectiveStatus(item);
    if (activeTab === "Sắp diễn ra") return status === "REGISTERED" || status === "WAITLISTED";
    if (activeTab === "Đã tham gia") return status === "ATTENDED";
    if (activeTab === "Vắng mặt") return status === "ABSENT";
    if (activeTab === "Đã hủy") return status === "CANCELLED";
    return true;
  });

  const visibleSavedEvents = savedEvents.filter(
    (item) => item.events && !isEventExpired(item.events)
  );

  const isSavedTab = activeTab === "Đã lưu";
  const visibleItemCount = isSavedTab
    ? visibleSavedEvents.length
    : filteredRegistrations.length;

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
            savedEvents={visibleSavedEvents}
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
          ) : visibleItemCount === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 mt-8 text-center text-gray-400 shadow-sm">
              {isSavedTab ? (
                <Bookmark className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              ) : (
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              )}
              <h3 className="text-base font-bold text-gray-700">
                {isSavedTab ? "Chưa lưu sự kiện nào" : "Chưa có sự kiện nào"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isSavedTab
                  ? "Các sự kiện bạn bookmark sẽ xuất hiện tại đây."
                  : `Bạn chưa có sự kiện nào ở mục "${activeTab}".`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {isSavedTab
                ? visibleSavedEvents.map((item) => {
                    const event = item.events;
                    if (!event) return null;

                    return (
                      <EventCard
                        key={item.event_id}
                        eventId={event.event_id}
                        image={event.banner_url}
                        badgeText="Đã lưu"
                        title={event.title}
                        faculty={event.organizer?.name || "Sự kiện đã lưu"}
                        date={formatSavedEventDate(event.start_time, event.end_time)}
                        location={event.location}
                        showRegisterButton={false}
                        onUnsave={handleUnsaveEvent}
                      />
                    );
                  })
                : filteredRegistrations.map((item) => (
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
