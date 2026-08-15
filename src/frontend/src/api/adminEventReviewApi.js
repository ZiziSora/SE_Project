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


function mapEventReview(event) {
  const organizerName = event.organizer_name || "Ban tổ chức";
  const fileUrl = getPublicUrl(event.file_url);

  return {
    id: event.event_id,
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
