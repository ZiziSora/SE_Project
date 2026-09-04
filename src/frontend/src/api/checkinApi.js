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

export async function manualCheckin({ eventId, registrationId, studentCode, code }) {
  try {
    const response = await api.post(`/api/checkin/events/${eventId}/manual`, {
      registration_id: registrationId || null,
      student_code: studentCode || null,
      code: code || null,
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      return processCheckin({ eventId, code: studentCode || code || registrationId });
    }
    throw err;
  }
}
