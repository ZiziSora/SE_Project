import api from "./axios";


export async function getMyEvents() {
  const response = await api.get("/api/my-events");
  return response.data;
}


export async function cancelRegistration(registrationId) {
  const response = await api.patch(
    `/api/registrations/${registrationId}/cancel`,
  );
  return response.data;
}
