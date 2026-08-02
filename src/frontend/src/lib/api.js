import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.detail || "Đã xảy ra lỗi khi gọi API.", response.status);
  }
  return payload;
}

export const api = {
  getEvent: (eventId) => request(`/events/${eventId}`),
  getRegistrationStatus: (eventId) => request(`/events/${eventId}/registration-status`),
  registerForEvent: (eventId) => request(`/events/${eventId}/register`, { method: "POST" }),
  getSavedStatus: (eventId) => request(`/events/${eventId}/saved-status`),
  saveEvent: (eventId) => request(`/events/${eventId}/save`, { method: "POST" }),
  unsaveEvent: (eventId) => request(`/events/${eventId}/save`, { method: "DELETE" }),
};

export { ApiError };
