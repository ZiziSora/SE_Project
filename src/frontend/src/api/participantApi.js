import api from "./axios.js";

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

export const participantsApi = {
  /** Danh sách sự kiện mà organizer đang quản lý. */
  async listEvents(params = {}) {
    try {
      const response = await api.get("/api/organizer/events", {
        params: compactParams(params),
      });
      const data = response.data;
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      return { items, is_mock: false };
    } catch {
      // Fallback nếu gọi endpoint sự kiện tổng hợp
      const response = await api.get("/api/organizer/events", {
        params: compactParams({ page: 1, page_size: 50, ...params }),
      });
      return { items: response.data?.items ?? [], is_mock: false };
    }
  },

  /** Thông tin sự kiện để hiển thị tiêu đề trang chi tiết. */
  async getEvent(eventId) {
    try {
      const response = await api.get(`/api/checkin/events/${eventId}/stats`);
      return {
        event_id: response.data.event_id,
        title: response.data.title,
        capacity: response.data.capacity,
        is_mock: false,
      };
    } catch {
      const response = await api.get(`/api/organizer/events/${eventId}`);
      return { ...response.data, is_mock: false };
    }
  },

  /** Số liệu tổng đăng ký / đã điểm danh / chưa điểm danh. */
  async summary(eventId) {
    const response = await api.get(`/api/checkin/events/${eventId}/stats`);
    const data = response.data;
    const total = data.total_registered || 0;
    const checkedIn = data.total_checked_in || 0;
    return {
      total,
      checked_in: checkedIn,
      not_checked_in: Math.max(0, total - checkedIn),
      is_mock: false,
    };
  },

  /** Danh sách người tham gia, có lọc theo trạng thái điểm danh + tìm kiếm + phân trang. */
  async list(eventId, { status, search, page = 1, pageSize = 8 } = {}) {
    const response = await api.get(`/api/checkin/events/${eventId}/stats`);
    const data = response.data;
    const participants = data.participants || [];

    // Filter by status
    const filtered = participants.filter((item) => {
      const isCheckedIn = item.registration_status === "CHECKED_IN";
      if (status === "checked_in" && !isCheckedIn) return false;
      if (status === "not_checked_in" && isCheckedIn) return false;

      if (!search || !search.trim()) return true;
      const kw = search.trim().toLowerCase();
      const nameMatch = item.full_name?.toLowerCase().includes(kw);
      const emailMatch = item.email?.toLowerCase().includes(kw);
      const codeMatch = item.student_code?.toLowerCase().includes(kw);
      return nameMatch || emailMatch || codeMatch;
    });

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const paginatedItems = filtered.slice(start, start + pageSize);

    return {
      items: paginatedItems,
      total: totalCount,
      page: safePage,
      page_size: pageSize,
      total_pages: totalPages,
      is_mock: false,
    };
  },

  /** Điểm danh thủ công cho một lượt đăng ký. */
  async checkIn(eventId, codeOrStudentCode) {
    const response = await api.post("/api/checkin", {
      event_id: eventId,
      code: codeOrStudentCode,
    });
    return { ...response.data, is_mock: false };
  },
};

export default participantsApi;
