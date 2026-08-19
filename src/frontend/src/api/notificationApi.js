import api from "./axios";


export const notificationApi = {
  async list({ page = 1, pageSize = 20 } = {}) {
    const response = await api.get("/api/notifications", {
      params: {
        page,
        page_size: pageSize,
      },
    });
    return response.data;
  },

  async unreadCount() {
    const response = await api.get("/api/notifications/unread-count");
    return response.data;
  },

  async get(notificationId) {
    const response = await api.get(`/api/notifications/${notificationId}`);
    return response.data;
  },

  async markRead(notificationId) {
    const response = await api.patch(
      `/api/notifications/${notificationId}/read`,
    );
    return response.data;
  },
};
