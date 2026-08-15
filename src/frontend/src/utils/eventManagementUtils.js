export const STATUS_LABELS = {
  DRAFT: { label: "Bản nháp", className: "bg-blue-100 text-blue-600" },
  PENDING: { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700" },
  PUBLISHED: {
    label: "Đang mở đăng ký",
    className: "bg-teal-100 text-teal-700",
  },
  ONGOING: {
    label: "Đang diễn ra",
    className: "bg-blue-100 text-blue-700",
  },
  ENDED: { label: "Đã kết thúc", className: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-600" },
};


export function getStatusDisplay(status) {
  const key = (status ?? "DRAFT").toUpperCase();
  return (
    STATUS_LABELS[key] ?? {
      label: status ?? "Bản nháp",
      className: "bg-gray-100 text-gray-600",
    }
  );
}


export const FILTER_TO_STATUS = {
  "Tất cả": undefined,
  "Đang mở đăng ký": "PUBLISHED",
  "Đang diễn ra": "ONGOING",
  "Chờ duyệt": "PENDING",
  "Bản nháp": "DRAFT",
  "Đã kết thúc": "ENDED",
  "Đã hủy": "CANCELLED",
};


export function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa cập nhật"
    : date.toLocaleString("vi-VN");
}


export function formatRegistered(event) {
  return `${event.registered_count}/${event.capacity ?? "∞"}`;
}
