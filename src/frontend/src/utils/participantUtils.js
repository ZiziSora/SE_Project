// Tiện ích dùng chung cho phần "Quản lý người tham gia".
// Backend do bạn khác trong nhóm đảm nhiệm, nên các hàm ở đây chỉ xử lý hiển thị
// và luôn phòng trường hợp trường dữ liệu bị thiếu (null / undefined).

export const ATTENDANCE_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "checked_in", label: "Đã điểm danh" },
  { key: "not_checked_in", label: "Chưa điểm danh" },
];

export const ATTENDANCE_STATUS = {
  checked_in: {
    label: "Đã điểm danh",
    className: "border-teal-200 bg-teal-50 text-teal-700",
    dotClass: "bg-teal-500",
  },
  not_checked_in: {
    label: "Chưa điểm danh",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dotClass: "bg-amber-500",
  },
  waitlisted: {
    label: "Danh sách chờ",
    className: "border-yellow-200 bg-yellow-50 text-yellow-700",
    dotClass: "bg-yellow-500",
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dotClass: "bg-rose-500",
  },
};

/** 
 * Kiểm tra trạng thái điểm danh:
 * Ưu tiên kiểm tra registration_status === 'CHECKED_IN'.
 */
export function isCheckedIn(participant) {
  if (!participant) return false;
  const status = String(participant.registration_status || participant.status || "").toUpperCase();
  return status === "CHECKED_IN";
}

export function getAttendanceDisplay(participant) {
  if (!participant) return ATTENDANCE_STATUS.not_checked_in;

  const status = String(participant.registration_status || participant.status || "").toUpperCase();

  if (status === "CHECKED_IN") {
    return ATTENDANCE_STATUS.checked_in;
  }
  if (status === "WAITLISTED") {
    return ATTENDANCE_STATUS.waitlisted;
  }
  if (status === "CANCELLED") {
    return ATTENDANCE_STATUS.cancelled;
  }

  return ATTENDANCE_STATUS.not_checked_in;
}

/** Lấy chữ cái đầu của họ và tên để làm avatar chữ khi sinh viên chưa có ảnh. */
export function getInitials(fullName) {
  const words = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "SV";
  if (words.length === 1) return words[0][0].toLocaleUpperCase("vi");
  return `${words.at(-1)[0]}`.toLocaleUpperCase("vi");
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 
 * "12/10/2024 14:30" — dùng cho cột Thời gian đăng ký.
 * Hỗ trợ fallback cả registered_at lẫn created_at.
 */
export function formatRegisteredAt(value) {
  const date = toDate(value);
  if (!date) return "--";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
}

/** "08:15" — dùng cho cột Giờ điểm danh, chưa điểm danh thì trả về "--". */
export function formatCheckedInAt(value) {
  const date = toDate(value);
  if (!date) return "--";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * "15 Tháng 10, 2024" cho sự kiện một ngày,
 * "20 - 25 Tháng 9, 2024" khi sự kiện kéo dài nhiều ngày trong cùng tháng.
 */
export function formatEventDateRange(event) {
  const start = toDate(event?.start_time);
  if (!start) return "Chưa cập nhật";

  const end = toDate(event?.end_time);
  const sameDay =
    end &&
    end.getFullYear() === start.getFullYear() &&
    end.getMonth() === start.getMonth() &&
    end.getDate() === start.getDate();

  if (!end || sameDay) {
    return `${start.getDate()} Tháng ${start.getMonth() + 1}, ${start.getFullYear()}`;
  }

  const sameMonth =
    end.getFullYear() === start.getFullYear() && end.getMonth() === start.getMonth();

  if (sameMonth) {
    return `${start.getDate()} - ${end.getDate()} Tháng ${start.getMonth() + 1}, ${start.getFullYear()}`;
  }

  return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}, ${end.getFullYear()}`;
}

export function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

/** "300 / 300 Người đăng ký" — hỗ trợ nhiều định dạng field từ backend. */
export function formatRegisteredCount(event) {
  const rawCount = event?.registered_count ?? event?.total_registered ?? event?.participant_count ?? 0;
  const count = event?.capacity ? Math.min(rawCount, event.capacity) : rawCount;
  const registered = formatNumber(count);
  if (!event?.capacity) return `${registered} Người đăng ký`;
  return `${registered} / ${formatNumber(event.capacity)} Người đăng ký`;
}

/** Phần trăm lấp đầy cho thanh tiến trình trên thẻ sự kiện (0 - 100). */
export function getProgressPercent(event) {
  const rawCount = Number(
    event?.registered_count ?? event?.total_registered ?? event?.participant_count ?? 0
  );
  const capacity = Number(event?.capacity ?? 0);
  const registered = capacity ? Math.min(rawCount, capacity) : rawCount;
  if (!capacity) return registered > 0 ? 100 : 0;
  return Math.min(100, Math.round((registered / capacity) * 100));
}