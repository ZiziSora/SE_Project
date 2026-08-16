import api from "./axios.js";
import {
  buildMockParticipantPage,
  buildMockSummary,
  findMockEvent,
  MOCK_EVENTS,
} from "../utils/participantMockData.js";

// Backend cho phần "Quản lý người tham gia" đang được thành viên khác trong nhóm dựng.
// Mỗi hàm dưới đây gọi endpoint thật trước; nếu backend chưa chạy hoặc route chưa tồn tại
// thì trả về dữ liệu mẫu kèm cờ `is_mock` để giao diện vẫn xem được, thay vì báo lỗi đỏ.
// Khi API thật sẵn sàng, không cần sửa component — chỉ việc xoá phần fallback ở đây.

const PARTICIPANT_STATUS_PARAM = {
  all: undefined,
  checked_in: "CHECKED_IN",
  not_checked_in: "NOT_CHECKED_IN",
};

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

/**
 * Chỉ dùng dữ liệu mẫu khi lỗi đến từ việc backend chưa sẵn sàng.
 * Lỗi 401/403/500 vẫn ném ra ngoài để người dùng biết mà xử lý.
 */
function isBackendMissing(error) {
  const status = error?.response?.status;
  return !error?.response || status === 404 || status === 405 || status === 501;
}

export const participantsApi = {
  /** Danh sách sự kiện mà organizer đang quản lý người tham gia. */
  async listEvents(params = {}) {
    try {
      const response = await api.get("/api/organizer/participants/events", {
        params: compactParams(params),
      });
      const data = response.data;
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      return { items, is_mock: false };
    } catch (error) {
      if (!isBackendMissing(error)) throw error;
      const keyword = String(params.search ?? "").trim().toLocaleLowerCase("vi");
      const items = keyword
        ? MOCK_EVENTS.filter((event) =>
            event.title.toLocaleLowerCase("vi").includes(keyword),
          )
        : MOCK_EVENTS;
      return { items, is_mock: true };
    }
  },

  /** Thông tin sự kiện để hiển thị tiêu đề trang chi tiết. */
  async getEvent(eventId) {
    try {
      const response = await api.get(`/api/organizer/events/${eventId}`);
      return { ...response.data, is_mock: false };
    } catch (error) {
      if (!isBackendMissing(error)) throw error;
      return { ...findMockEvent(eventId), is_mock: true };
    }
  },

  /** Số liệu tổng đăng ký / đã điểm danh / chưa điểm danh. */
  async summary(eventId) {
    try {
      const response = await api.get(
        `/api/organizer/events/${eventId}/participants/summary`,
      );
      return { ...response.data, is_mock: false };
    } catch (error) {
      if (!isBackendMissing(error)) throw error;
      return { ...buildMockSummary(), is_mock: true };
    }
  },

  /** Danh sách người tham gia, có lọc theo trạng thái điểm danh + tìm kiếm + phân trang. */
  async list(eventId, { status, search, page = 1, pageSize = 8 } = {}) {
    try {
      const response = await api.get(
        `/api/organizer/events/${eventId}/participants`,
        {
          params: compactParams({
            status: PARTICIPANT_STATUS_PARAM[status] ?? undefined,
            search,
            page,
            page_size: pageSize,
          }),
        },
      );
      const data = response.data;
      return {
        items: data?.items ?? [],
        total: data?.total ?? 0,
        page: data?.page ?? page,
        page_size: data?.page_size ?? pageSize,
        total_pages: data?.total_pages ?? 1,
        is_mock: false,
      };
    } catch (error) {
      if (!isBackendMissing(error)) throw error;
      return { ...buildMockParticipantPage({ status, search, page, pageSize }), is_mock: true };
    }
  },

  /** Điểm danh thủ công cho một lượt đăng ký. */
  async checkIn(eventId, registrationId) {
    try {
      const response = await api.post(
        `/api/organizer/events/${eventId}/participants/${registrationId}/check-in`,
      );
      return { ...response.data, is_mock: false };
    } catch (error) {
      if (!isBackendMissing(error)) throw error;
      return { checked_in_at: new Date().toISOString(), is_mock: true };
    }
  },
};

export default participantsApi;
