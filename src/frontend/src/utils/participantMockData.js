// Dữ liệu mẫu dùng tạm khi endpoint "Quản lý người tham gia" chưa sẵn sàng.
// Khi backend hoàn thiện, `participantApi.js` sẽ tự lấy dữ liệu thật và file này
// không còn được gọi tới nữa — có thể xoá mà không ảnh hưởng giao diện.

export const MOCK_EVENTS = [
  {
    event_id: "mock-ai-health-2024",
    title: "Hội thảo Trí tuệ Nhân tạo trong Y tế Công cộng 2024",
    start_time: "2024-10-15T08:00:00",
    end_time: "2024-10-15T17:00:00",
    event_status: "PUBLISHED",
    registered_count: 300,
    capacity: 300,
    banner_url: null,
  },
  {
    event_id: "mock-orientation-week",
    title: "Tuần lễ Định hướng Tân sinh viên Khoa Khoa học Máy tính",
    start_time: "2024-09-20T07:30:00",
    end_time: "2024-09-25T17:00:00",
    event_status: "ONGOING",
    registered_count: 1200,
    capacity: null,
    banner_url: null,
  },
];

const MOCK_NAMES = [
  "Nguyễn Văn An",
  "Trần Thị Linh",
  "Lê Hoàng Minh",
  "Phạm Thu Phương",
  "Võ Quốc Bảo",
  "Đặng Ngọc Hà",
  "Bùi Tiến Dũng",
  "Hoàng Mai Chi",
  "Đỗ Nhật Nam",
  "Ngô Thanh Trúc",
  "Vũ Gia Huy",
  "Lý Khánh Vy",
  "Trịnh Bảo Long",
  "Phan Diệu Anh",
  "Dương Minh Khoa",
  "Cao Thùy Dương",
  "Hồ Anh Tuấn",
  "Tô Kiều Oanh",
  "Lâm Chí Thành",
  "Đinh Hải Yến",
  "Mai Đức Thịnh",
  "Tạ Bích Ngọc",
  "Chu Hữu Phát",
  "Lưu Thảo Vy",
];

/** Bỏ dấu tiếng Việt để dựng email sinh viên giả lập. */
function removeDiacritics(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function buildEmail(fullName, studentCode) {
  const words = removeDiacritics(fullName).toLowerCase().split(/\s+/).filter(Boolean);
  const given = words.at(-1) ?? "sv";
  const initials = words.slice(0, -1).map((word) => word[0]).join("");
  return `${given}.${initials}${studentCode}@student.uni.edu.vn`;
}

/**
 * Danh sách người tham gia mẫu — cố định (không random) để mỗi lần mở trang
 * đều thấy cùng một bộ dữ liệu, tiện đối chiếu khi demo.
 */
export const MOCK_PARTICIPANTS = MOCK_NAMES.map((fullName, index) => {
  const studentCode = String(20200000 + index * 1111 + 1234);
  const day = String(12 + (index % 16)).padStart(2, "0");
  const hour = String(8 + (index % 9)).padStart(2, "0");
  const minute = String((index * 7) % 60).padStart(2, "0");
  const hasCheckedIn = index % 3 !== 1;

  return {
    registration_id: `mock-reg-${index + 1}`,
    full_name: fullName,
    student_code: studentCode,
    email: buildEmail(fullName, studentCode),
    avatar_url: null,
    registered_at: `2024-10-${day}T${hour}:${minute}:00`,
    checked_in_at: hasCheckedIn
      ? `2024-10-15T08:${String(10 + (index % 45)).padStart(2, "0")}:00`
      : null,
  };
});

function matchesSearch(participant, search) {
  if (!search) return true;
  const keyword = search.trim().toLocaleLowerCase("vi");
  return [participant.full_name, participant.student_code, participant.email]
    .filter(Boolean)
    .some((field) => String(field).toLocaleLowerCase("vi").includes(keyword));
}

function matchesStatus(participant, status) {
  if (!status || status === "all") return true;
  return status === "checked_in"
    ? Boolean(participant.checked_in_at)
    : !participant.checked_in_at;
}

/** Mô phỏng đúng hình dạng phản hồi phân trang mà backend sẽ trả về. */
export function buildMockParticipantPage({ status, search, page = 1, pageSize = 8 }) {
  const filtered = MOCK_PARTICIPANTS.filter(
    (participant) => matchesStatus(participant, status) && matchesSearch(participant, search),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page: safePage,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export function buildMockSummary() {
  const checkedIn = MOCK_PARTICIPANTS.filter((item) => item.checked_in_at).length;
  return {
    total: MOCK_PARTICIPANTS.length,
    checked_in: checkedIn,
    not_checked_in: MOCK_PARTICIPANTS.length - checkedIn,
  };
}

export function findMockEvent(eventId) {
  return MOCK_EVENTS.find((event) => event.event_id === eventId) ?? MOCK_EVENTS[0];
}
