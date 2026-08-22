import api from "./axios";


function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}


export const eventsApi = {
  async list(params = {}) {
    const response = await api.get("/api/organizer/events", {
      params: compactParams(params),
    });
    return response.data;
  },

  async get(eventId) {
    const response = await api.get(`/api/organizer/events/${eventId}`);
    return response.data;
  },

  async stats() {
    const response = await api.get("/api/organizer/events/stats");
    return response.data;
  },

  async locations() {
    const response = await api.get("/api/organizer/events/locations");
    return response.data;
  },

  async create(payload) {
    const response = await api.post("/api/organizer/events", payload);
    return response.data;
  },

  async update(eventId, payload) {
    const response = await api.put(
      `/api/organizer/events/${eventId}`,
      payload,
    );
    return response.data;
  },

  async changeStatus(eventId, eventStatus) {
    const response = await api.patch(
      `/api/organizer/events/${eventId}/status`,
      { event_status: eventStatus },
    );
    return response.data;
  },

  /** Rút lại yêu cầu chỉnh sửa đang chờ Admin duyệt. */
  async cancelRevision(eventId) {
    const response = await api.delete(
      `/api/organizer/events/${eventId}/revision`,
    );
    return response.data;
  },

  async remove(eventId) {
    const response = await api.delete(`/api/organizer/events/${eventId}`);
    return response.data;
  },
};


export const categoriesApi = {
  async list() {
    const response = await api.get("/api/categories");
    return response.data;
  },
};


export const uploadsApi = {
  async banner(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/uploads/banner", formData);
    return response.data;
  },

  async eventPlan(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/uploads/event-plan", formData);
    return response.data;
  },
};


export const publicEventApi = {
  async listOngoingEvents() {
    const response = await api.get("/api/events/ongoing");
    return response.data;
  },

  async getRecommendations(limit = 6) {
    const response = await api.get("/api/events/recommendations", {
      params: { limit },
    });
    return response.data;
  },

  async getEvent(eventId) {
    const response = await api.get(`/api/events/${eventId}`);
    return response.data;
  },

  async getRegistrationStatus(eventId) {
    const response = await api.get(
      `/api/events/${eventId}/registration-status`,
    );
    return response.data;
  },

  async registerForEvent(eventId) {
    const response = await api.post(`/api/events/${eventId}/register`);
    return response.data;
  },

  async getSavedStatus(eventId) {
    const response = await api.get(`/api/events/${eventId}/saved-status`);
    return response.data;
  },

  async saveEvent(eventId) {
    const response = await api.post(`/api/events/${eventId}/save`);
    return response.data;
  },

  async unsaveEvent(eventId) {
    const response = await api.delete(`/api/events/${eventId}/save`);
    return response.data;
  },
};
