import api from "./axios.js";


const BANNER_THEMES = [
  "quantum",
  "hackathon",
  "ethics",
  "green",
  "career",
  "music",
];


function getInitials(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "BT";
  return `${words[0][0]}${words.at(-1)[0]}`.toLocaleUpperCase("vi");
}


function getBannerTheme(eventId) {
  const characterTotal = Array.from(eventId || "").reduce(
    (total, character) => total + character.codePointAt(0),
    0,
  );
  return BANNER_THEMES[characterTotal % BANNER_THEMES.length];
}


function getPublicUrl(value) {
  if (!value) return null;

  let normalizedValue = String(value).trim();
  const firstCharacter = normalizedValue[0];
  const lastCharacter = normalizedValue.at(-1);
  if (
    normalizedValue.length >= 2
    && ["'", '"'].includes(firstCharacter)
    && lastCharacter === firstCharacter
  ) {
    normalizedValue = normalizedValue.slice(1, -1).trim();
  }

  try {
    const url = new URL(normalizedValue);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}


function getFileName(fileUrl) {
  if (!fileUrl) return null;
  try {
    const fileName = new URL(fileUrl).pathname.split("/").at(-1);
    return decodeURIComponent(fileName || "") || "Kế hoạch sự kiện";
  } catch {
    return "Kế hoạch sự kiện";
  }
}


/**
 * Hàng chờ của Admin gộp hai loại hồ sơ:
 *   NEW      — sự kiện mới gửi duyệt lần đầu (bảng `events`)
 *   REVISION — yêu cầu chỉnh sửa sự kiện đã công khai (bảng `event_revisions`)
 * Hai loại đi qua API khác nhau nên được nắn về CÙNG một hình dạng ở đây, để
 * component hàng chờ không phải biết chúng khác nhau ở đâu.
 */
function mapEventReview(event) {
  const organizerName = event.organizer_name || "Ban tổ chức";
  const fileUrl = getPublicUrl(event.file_url);

  return {
    kind: "NEW",
    id: event.event_id,
    eventId: event.event_id,
    detailPath: `/admin/events/${event.event_id}`,
    changes: [],
    organizerId: event.organizer_id,
    title: event.title || "Sự kiện chưa có tên",
    organizerName,
    organization: event.organizer_department || "Chưa cập nhật đơn vị",
    organizerInitials: getInitials(organizerName),
    submittedAt: event.created_at || null,
    startTime: event.start_time,
    endTime: event.end_time,
    registrationDeadline: event.registration_deadline,
    location: event.location || "Chưa cập nhật địa điểm",
    category: event.category_name || "Chưa phân loại",
    capacity: event.capacity,
    description: event.description || "Chưa có mô tả cho sự kiện.",
    bannerUrl: getPublicUrl(event.banner_url),
    bannerTheme: getBannerTheme(event.event_id),
    fileUrl,
    fileName: getFileName(fileUrl),
    status: (event.approval_status || "pending").toUpperCase(),
  };
}


function mapEventRevision(revision) {
  const values = revision.values || {};
  const organizerName = revision.organizer_name || "Ban tổ chức";
  const fileUrl = getPublicUrl(values.file_url);

  return {
    kind: "REVISION",
    id: revision.revision_id,
    eventId: revision.event_id,
    detailPath: `/admin/event-changes/${revision.revision_id}`,
    // Bảng so sánh cũ → mới, backend đã định dạng sẵn old_text / new_text
    changes: revision.changes || [],

    // Nội dung hiển thị là bản MỚI mà Ban tổ chức đề xuất
    title: values.title || revision.event_title || "Sự kiện chưa có tên",
    // Tên đang chạy trên bảng events — để đối chiếu khi chính tên bị đổi
    currentTitle: revision.event_title,
    organizerName,
    organization: revision.organizer_department || "Chưa cập nhật đơn vị",
    organizerInitials: getInitials(organizerName),
    submittedAt: revision.submitted_at || null,
    startTime: values.start_time,
    endTime: values.end_time,
    registrationDeadline: values.registration_deadline,
    location: values.location || "Chưa cập nhật địa điểm",
    category: revision.category_name || "Chưa phân loại",
    capacity: values.capacity,
    description: values.description || "Chưa có mô tả cho sự kiện.",
    bannerUrl: getPublicUrl(values.banner_url),
    bannerTheme: getBannerTheme(revision.event_id),
    fileUrl,
    fileName: getFileName(fileUrl),
    status: (revision.status || "pending").toUpperCase(),
  };
}


export async function getPendingEventReviews() {
  const response = await api.get("/api/admin/review-events");
  return {
    ...response.data,
    items: response.data.items.map(mapEventReview),
  };
}


export async function approveEventReview(eventId) {
  const response = await api.patch(
    `/api/admin/review-events/${eventId}/accept`,
  );
  return {
    message: response.data.message,
    event: mapEventReview(response.data.event),
  };
}


export async function rejectEventReview(eventId) {
  const response = await api.patch(
    `/api/admin/review-events/${eventId}/reject`,
  );
  return {
    message: response.data.message,
    event: mapEventReview(response.data.event),
  };
}


export async function getPendingEventChanges() {
  const response = await api.get("/api/admin/review-event-changes");
  return {
    ...response.data,
    items: response.data.items.map(mapEventRevision),
  };
}


export async function approveEventChange(revisionId) {
  const response = await api.patch(
    `/api/admin/review-event-changes/${revisionId}/accept`,
  );
  return {
    message: response.data.message,
    event: mapEventRevision(response.data.revision),
  };
}


export async function rejectEventChange(revisionId) {
  const response = await api.patch(
    `/api/admin/review-event-changes/${revisionId}/reject`,
  );
  return {
    message: response.data.message,
    event: mapEventRevision(response.data.revision),
  };
}


/**
 * Hàng chờ gộp: sự kiện mới trước, yêu cầu chỉnh sửa sau.
 *
 * Gọi song song hai API. Nếu một bên lỗi (ví dụ chưa tạo bảng event_revisions)
 * thì vẫn trả về bên còn lại thay vì làm hỏng cả trang duyệt.
 */
export async function getReviewQueue() {
  const [newEvents, changes] = await Promise.allSettled([
    getPendingEventReviews(),
    getPendingEventChanges(),
  ]);

  if (newEvents.status === "rejected" && changes.status === "rejected") {
    throw newEvents.reason;
  }

  const newItems = newEvents.status === "fulfilled" ? newEvents.value.items : [];
  const changeItems = changes.status === "fulfilled" ? changes.value.items : [];

  return {
    items: [...newItems, ...changeItems],
    total: newItems.length + changeItems.length,
    newTotal: newItems.length,
    changeTotal: changeItems.length,
  };
}


/** Duyệt / từ chối đúng API tương ứng với loại hồ sơ. */
export function decideReviewItem(item, action) {
  const isApproving = action === "approve";
  if (item.kind === "REVISION") {
    return isApproving
      ? approveEventChange(item.id)
      : rejectEventChange(item.id);
  }
  return isApproving ? approveEventReview(item.id) : rejectEventReview(item.id);
}
