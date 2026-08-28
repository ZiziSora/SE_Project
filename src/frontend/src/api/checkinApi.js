import api from "./axios";

export async function processCheckin({ eventId, code }) {
  const response = await api.post("/api/checkin", {
    event_id: eventId || null,
    code: code.trim(),
  });
  return response.data;
}

export async function getMyQrCode(eventId) {
  const response = await api.get(`/api/checkin/events/${eventId}/my-qr`);
  return response.data;
}

export async function getEventCheckinStats(eventId) {
  const response = await api.get(`/api/checkin/events/${eventId}/stats`);
  return response.data;
}
