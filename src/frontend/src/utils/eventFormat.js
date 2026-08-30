// Định dạng dùng chung cho THẺ sự kiện ở mọi trang: Khám phá (student),
// Trang chủ Ban tổ chức, và tab "Đã lưu" trong Sự kiện của tôi.
//
// Mục tiêu: một sự kiện phải hiển thị y hệt nhau ở mọi nơi — cùng cách viết
// ngày giờ, cùng tag lĩnh vực, cùng cách đếm chỗ. Trước đây mỗi trang tự
// `${event.start_time}` nên người dùng thấy chuỗi ISO thô kiểu
// "2026-09-20T02:00:00".

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const MONTH_SHORT_LABELS = [
  "THG 1", "THG 2", "THG 3", "THG 4", "THG 5", "THG 6",
  "THG 7", "THG 8", "THG 9", "THG 10", "THG 11", "THG 12",
];

/** Chuỗi từ API là giờ Việt Nam dạng naive; `new Date` xử lý được cả hai dạng. */
function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(number) {
  return String(number).padStart(2, "0");
}

/** "09:00" */
export function formatTimeOfDay(value) {
  const date = toDate(value);
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "T5, 20/09/2026" */
export function formatEventDay(value) {
  const date = toDate(value);
  if (!date) return "";
  return `${WEEKDAY_LABELS[date.getDay()]}, ${pad(date.getDate())}/${pad(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`;
}

/**
 * Giờ diễn ra, tách riêng khỏi ngày để thẻ sự kiện xuống được hai dòng:
 * ngày một dòng, giờ một dòng — không dòng nào bị cắt cụt bằng "…".
 * Cùng ngày  -> "02:00 - 10:00"
 * Khác ngày  -> "02:00 → 10:00 (21/09)"
 */
export function formatEventTimeRange(startValue, endValue) {
  const start = toDate(startValue);
  if (!start) return "Chưa xác định giờ";

  const end = toDate(endValue);
  const startTime = formatTimeOfDay(start);
  if (!end) return startTime;

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) return `${startTime} - ${formatTimeOfDay(end)}`;

  return `${startTime} → ${formatTimeOfDay(end)} (${pad(end.getDate())}/${pad(
    end.getMonth() + 1,
  )})`;
}

/**
 * Dòng ngày giờ đầy đủ trên thẻ sự kiện.
 * Cùng ngày  -> "T5, 20/09/2026 · 09:00 - 11:30"
 * Khác ngày  -> "T5, 20/09/2026 09:00 → T6, 21/09/2026 17:00"
 */
export function formatEventSchedule(startValue, endValue) {
  const start = toDate(startValue);
  if (!start) return "Thời gian chưa xác định";

  const end = toDate(endValue);
  const startDay = formatEventDay(start);
  const startTime = formatTimeOfDay(start);

  if (!end) return `${startDay} · ${startTime}`;

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${startDay} · ${startTime} - ${formatTimeOfDay(end)}`;
  }

  return `${startDay} ${startTime} → ${formatEventDay(end)} ${formatTimeOfDay(end)}`;
}

/** { month: "THG 9", day: "20" } — dùng cho ô lịch góc ảnh bìa. */
export function formatDateBadge(value) {
  const date = toDate(value);
  if (!date) return { month: "THG --", day: "--" };
  return {
    month: MONTH_SHORT_LABELS[date.getMonth()],
    day: pad(date.getDate()),
  };
}

/**
 * Số chỗ: "1/300" khi sự kiện có giới hạn, "1 người" khi không giới hạn.
 * KHÔNG dùng "1 đã đăng ký" nữa vì con số đó không cho biết còn chỗ hay không.
 */
export function formatCapacity(registeredCount, capacity) {
  const registered = Number(registeredCount) || 0;
  const limit = Number(capacity);
  if (Number.isFinite(limit) && limit > 0) return `${registered}/${limit}`;
  return `${registered} người`;
}

/** Còn chỗ hay đã đầy — quyết định nút "Đăng ký" hay "Vào danh sách chờ". */
export function isEventFull(registeredCount, capacity) {
  const limit = Number(capacity);
  if (!Number.isFinite(limit) || limit <= 0) return false;
  return (Number(registeredCount) || 0) >= limit;
}

/** Tên lĩnh vực hiển thị trên tag; chấp nhận nhiều dạng payload khác nhau. */
export function resolveCategoryName(event = {}) {
  return (
    event.category_name ||
    event.event_categories?.name ||
    event.category?.name ||
    null
  );
}

/** Tên đơn vị tổ chức hiển thị dưới tiêu đề. */
export function resolveOrganizerName(event = {}) {
  return (
    event.organizer_name ||
    event.department_name ||
    event.organizer?.name ||
    event.organizer?.full_name ||
    event.organizer?.department_name ||
    null
  );
}
