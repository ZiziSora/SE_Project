import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Square,
  SquareCheckBig,
  Trash2,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { notificationApi } from "../api/notificationApi.js";
import NotificationDeleteDialog from "./NotificationDeleteDialog.jsx";


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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
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
      if (pendingDelete) return;

      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
        setSelectedNotification(null);
        setSelectedIds(new Set());
        setIsSelectionMode(false);
      }
    };

    const handleKeyDown = (event) => {
      if (pendingDelete) return;

      if (event.key === "Escape") {
        setIsOpen(false);
        setSelectedNotification(null);
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, pendingDelete]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await notificationApi.list({ page: 1, pageSize: 20 });
      setNotifications(data.items || []);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
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
    setSelectedIds(new Set());
    setIsSelectionMode(false);

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

  const removeDeletedNotifications = (notificationIds) => {
    const deletedIds = new Set(notificationIds);
    const deletedUnreadCount = notifications.filter(
      (notification) =>
        deletedIds.has(notification.notification_id) && !notification.is_read,
    ).length;

    setNotifications((items) =>
      items.filter((item) => !deletedIds.has(item.notification_id)),
    );
    setUnreadCount((count) => Math.max(0, count - deletedUnreadCount));
  };

  const handleDeleteNotification = async (notification) => {
    setPendingDelete({
      notificationIds: [notification.notification_id],
      notification,
    });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    const { notificationIds, notification } = pendingDelete;

    setIsDeleting(true);
    setError("");
    try {
      if (notificationIds.length === 1) {
        await notificationApi.deleteOne(notificationIds[0]);
      } else {
        await notificationApi.deleteMany(notificationIds);
      }
      removeDeletedNotifications(notificationIds);
      if (
        notification &&
        selectedNotification?.notification_id === notification.notification_id
      ) {
        setSelectedNotification(null);
      }
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      toast.success(
        notificationIds.length === 1
          ? "Đã xóa thông báo."
          : `Đã xóa ${notificationIds.length} thông báo.`,
      );
      return true;
    } catch {
      setError(
        notificationIds.length === 1
          ? "Không thể xóa thông báo. Vui lòng thử lại."
          : "Không thể xóa các thông báo đã chọn. Vui lòng thử lại.",
      );
      toast.error("Xóa thông báo thất bại. Vui lòng thử lại.");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleNotificationSelection = (notificationId) => {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(notificationId)) {
        nextIds.delete(notificationId);
      } else {
        nextIds.add(notificationId);
      }
      return nextIds;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((currentIds) =>
      currentIds.size === notifications.length
        ? new Set()
        : new Set(notifications.map((item) => item.notification_id)),
    );
  };

  const handleDeleteSelected = async () => {
    const notificationIds = [...selectedIds];
    if (notificationIds.length === 0) return;
    setPendingDelete({ notificationIds, notification: null });
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
                {notifications.length > 0 && !isLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectionMode((isSelecting) => !isSelecting);
                      setSelectedIds(new Set());
                    }}
                    className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                  >
                    {isSelectionMode ? "Hủy" : "Chọn"}
                  </button>
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
              <div className="flex flex-wrap items-center gap-2">
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
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteNotification(selectedNotification)
                  }
                  disabled={isDeleting}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {isDeleting ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Trash2 className="size-4" aria-hidden="true" />
                  )}
                  Xóa thông báo
                </button>
              </div>
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
            <div>
              <div className="max-h-[26rem] overflow-y-auto p-2">
                {notifications.map((notification) => {
                  const isSelected = selectedIds.has(
                    notification.notification_id,
                  );

                  return (
                    <div
                      key={notification.notification_id}
                      className="relative mb-1 last:mb-0"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          isSelectionMode
                            ? toggleNotificationSelection(
                                notification.notification_id,
                              )
                            : handleSelectNotification(notification)
                        }
                        aria-pressed={
                          isSelectionMode ? isSelected : undefined
                        }
                        className={`flex w-full cursor-pointer gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                          isSelectionMode ? "pr-3" : "pr-12"
                        } ${
                          isSelected
                            ? "bg-purple-100 ring-1 ring-purple-300"
                            : notification.is_read
                              ? "hover:bg-gray-50"
                              : "bg-purple-50/80 hover:bg-purple-100/80"
                        }`}
                      >
                        {isSelectionMode ? (
                          isSelected ? (
                            <SquareCheckBig
                              className="mt-0.5 size-5 shrink-0 text-purple-700"
                              aria-hidden="true"
                            />
                          ) : (
                            <Square
                              className="mt-0.5 size-5 shrink-0 text-gray-400"
                              aria-hidden="true"
                            />
                          )
                        ) : (
                          <span
                            className={`mt-1.5 size-2 shrink-0 rounded-full ${
                              notification.is_read
                                ? "bg-gray-300"
                                : "bg-purple-600"
                            }`}
                            aria-hidden="true"
                          />
                        )}
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
                      {!isSelectionMode && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteNotification(notification)
                          }
                          disabled={isDeleting}
                          aria-label={`Xóa thông báo ${notification.title}`}
                          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-50"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {isSelectionMode && (
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="cursor-pointer text-xs font-semibold text-purple-700 hover:text-purple-900"
                  >
                    {selectedIds.size === notifications.length
                      ? "Bỏ chọn tất cả"
                      : "Chọn tất cả"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0 || isDeleting}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <LoaderCircle
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                    Xóa đã chọn ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {pendingDelete && (
        <NotificationDeleteDialog
          count={pendingDelete.notificationIds.length}
          isDeleting={isDeleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
