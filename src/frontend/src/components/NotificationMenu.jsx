import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { notificationApi } from "../api/notificationApi.js";


const TYPE_LABELS = {
  REGISTRATION_CONFIRMED: "Đăng ký thành công",
  REGISTRATION_CANCELLED: "Hủy đăng ký",
  EVENT_UPDATED: "Cập nhật sự kiện",
  EVENT_CANCELLED: "Sự kiện đã hủy",
  EVENT_REMINDER: "Nhắc lịch",
  EVENT_LOCATION_CHANGED: "Đổi địa điểm",
  EVENT_TIME_CHANGED: "Đổi thời gian",
  NEW_EVENT: "Sự kiện mới cần duyệt",
  NEW_ORGANIZER_REQUEST: "Yêu cầu Ban tổ chức mới",
  NEW_EVENT_REGISTRATION: "Người tham gia mới",
  ORGANIZER_REQUEST_APPROVED: "Yêu cầu Ban tổ chức được duyệt",
  ORGANIZER_REQUEST_REJECTED: "Yêu cầu Ban tổ chức bị từ chối",
  EVENT_APPROVED: "Sự kiện được duyệt",
  EVENT_REJECTED: "Sự kiện bị từ chối",
  WAITLIST_JOINED: "Danh sách chờ",
  WAITLIST_PROMOTED: "Đã có chỗ tham gia",
};


function formatCreatedAt(value) {
  if (!value) return "Vừa xong";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa xong";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}


export default function NotificationMenu({ role, tone = "purple" }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [error, setError] = useState("");
  const isNeutral = tone === "neutral";
  const isOrganizerRequestNotification =
    role === "admin" &&
    selectedNotification?.type === "NEW_ORGANIZER_REQUEST";
  const isNewRegistrationNotification =
    role === "organizer" &&
    selectedNotification?.type === "NEW_EVENT_REGISTRATION";
  const isOrganizerEventReviewNotification =
    role === "organizer" &&
    ["EVENT_APPROVED", "EVENT_REJECTED"].includes(
      selectedNotification?.type,
    );

  useEffect(() => {
    if (!localStorage.getItem("access_token")) return undefined;

    let isMounted = true;

    const refreshUnreadCount = async () => {
      try {
        const data = await notificationApi.unreadCount();
        if (isMounted) {
          setUnreadCount(data.unread_count || 0);
        }
      } catch {
        // Badge là dữ liệu bổ trợ, không làm gián đoạn điều hướng khi API lỗi.
      }
    };

    refreshUnreadCount();
    const intervalId = window.setInterval(refreshUnreadCount, 30_000);
    window.addEventListener("focus", refreshUnreadCount);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshUnreadCount);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
        setSelectedNotification(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSelectedNotification(null);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (role === "admin") {
        await notificationApi.syncPendingReviews();
      }
      const data = await notificationApi.list({ page: 1, pageSize: 20 });
      setNotifications(data.items || []);
      try {
        const unreadData = await notificationApi.unreadCount();
        setUnreadCount(unreadData.unread_count || 0);
      } catch {
        // Danh sách vẫn hiển thị khi chỉ API đếm badge bị lỗi.
      }
    } catch {
      setNotifications([]);
      setError("Không thể tải thông báo. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!localStorage.getItem("access_token")) {
      navigate("/auth/login");
      return;
    }

    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    setSelectedNotification(null);

    if (nextOpen) {
      fetchNotifications();
    }
  };

  const handleSelectNotification = async (notification) => {
    setIsLoadingDetail(true);
    setError("");

    try {
      const detail = await notificationApi.get(notification.notification_id);
      let displayedNotification = detail;

      if (!detail.is_read) {
        displayedNotification = await notificationApi.markRead(
          notification.notification_id,
        );
        setUnreadCount((count) => Math.max(0, count - 1));
        setNotifications((items) =>
          items.map((item) =>
            item.notification_id === notification.notification_id
              ? { ...item, is_read: true }
              : item,
          ),
        );
      }

      setSelectedNotification(displayedNotification);
    } catch {
      setError("Không thể mở chi tiết thông báo.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const triggerClassName = isNeutral
    ? "relative grid size-10 cursor-pointer place-items-center rounded-full border border-[#ddd5e7] bg-white text-[#4e4658] shadow-[0_5px_18px_rgba(38,25,53,0.04)] transition-colors hover:border-[#bca9d4] hover:text-[#6d20df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
    : "relative cursor-pointer rounded-full p-1 text-[#6c38cc] transition-colors hover:bg-[#ebe4ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c38cc]";

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Thông báo, ${unreadCount} chưa đọc`
            : "Thông báo"
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={triggerClassName}
      >
        <Bell
          className={isNeutral ? "size-[18px]" : "size-6"}
          strokeWidth={2}
          aria-hidden="true"
        />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          role="dialog"
          aria-label="Thông báo"
          className="absolute right-0 top-full z-70 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_22px_60px_rgba(41,24,75,0.2)]"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              {selectedNotification && (
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  aria-label="Quay lại danh sách thông báo"
                  className="grid size-8 cursor-pointer place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </button>
              )}
              <h2 className="font-['Manrope'] text-base font-bold text-gray-900">
                {selectedNotification ? "Chi tiết thông báo" : "Thông báo"}
              </h2>
            </div>
            {!selectedNotification && (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          {isLoading || isLoadingDetail ? (
            <div className="grid min-h-48 place-items-center text-purple-700">
              <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
            </div>
          ) : selectedNotification ? (
            <div className="space-y-4 p-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                  {isOrganizerRequestNotification
                    ? "Yêu cầu Ban tổ chức mới"
                    : TYPE_LABELS[selectedNotification.type] ||
                      "Thông báo sự kiện"}
                </span>
                <h3 className="mt-1.5 text-lg font-bold leading-snug text-gray-900">
                  {selectedNotification.title}
                </h3>
              </div>
              <p className="text-sm leading-6 text-gray-600">
                {selectedNotification.content}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatCreatedAt(selectedNotification.created_at)}
              </div>
              {(selectedNotification.event_id ||
                isOrganizerRequestNotification) && (
                <Link
                  to={
                    isOrganizerRequestNotification
                      ? "/admin/organizer-requests"
                      : isNewRegistrationNotification
                        ? `/organizer/participants/${selectedNotification.event_id}`
                        : isOrganizerEventReviewNotification
                          ? `/organizer/events/${selectedNotification.event_id}`
                      : role === "admin"
                        ? `/admin/events/${selectedNotification.event_id}`
                        : `/events/${selectedNotification.event_id}`
                  }
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-800"
                >
                  {isOrganizerRequestNotification ? (
                    <ShieldCheck className="size-4" aria-hidden="true" />
                  ) : isNewRegistrationNotification ? (
                    <Users className="size-4" aria-hidden="true" />
                  ) : (
                    <MapPin className="size-4" aria-hidden="true" />
                  )}
                  {isOrganizerRequestNotification
                    ? "Mở trang xét duyệt Ban tổ chức"
                    : isNewRegistrationNotification
                      ? "Xem người tham gia"
                      : isOrganizerEventReviewNotification
                        ? "Xem sự kiện"
                    : role === "admin"
                      ? "Mở trang xét duyệt"
                      : "Xem chi tiết sự kiện"}
                </Link>
              )}
            </div>
          ) : notifications.length === 0 ? (
            <div className="grid min-h-48 place-items-center px-6 text-center">
              <div>
                <Bell className="mx-auto size-8 text-gray-300" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-gray-700">
                  Chưa có thông báo
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Các cập nhật về sự kiện sẽ xuất hiện tại đây.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto p-2">
              {notifications.map((notification) => (
                <button
                  key={notification.notification_id}
                  type="button"
                  onClick={() => handleSelectNotification(notification)}
                  className={`mb-1 flex w-full cursor-pointer gap-3 rounded-xl px-3 py-3 text-left transition-colors last:mb-0 ${
                    notification.is_read
                      ? "hover:bg-gray-50"
                      : "bg-purple-50/80 hover:bg-purple-100/80"
                  }`}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      notification.is_read ? "bg-gray-300" : "bg-purple-600"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">
                      {notification.title}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-600">
                      {notification.content}
                    </span>
                    <span className="mt-1.5 block text-[11px] text-gray-400">
                      {formatCreatedAt(notification.created_at)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
