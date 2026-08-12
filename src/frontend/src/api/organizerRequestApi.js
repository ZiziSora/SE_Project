import api from "./axios";

const AVATAR_CLASSES = [
  "bg-[#7c3aed] text-white",
  "bg-[#dce7f8] text-[#526076]",
  "bg-[#d9e8ff] text-[#53657d]",
  "bg-[#fde7c7] text-[#8b5b00]",
  "bg-[#dff3e7] text-[#216348]",
  "bg-[#f3ddfa] text-[#75458c]",
];

function getInitials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "BT";

  return `${words[0][0]}${words.at(-1)[0]}`.toLocaleUpperCase("vi");
}

function getAvatarClass(name) {
  const characterTotal = Array.from(name).reduce(
    (total, character) => total + character.codePointAt(0),
    0,
  );
  return AVATAR_CLASSES[characterTotal % AVATAR_CLASSES.length];
}

function mapOrganizerRequest(request) {
  return {
    id: request.request_id,
    userId: request.user_id,
    name: request.full_name,
    email: request.email,
    initials: getInitials(request.full_name),
    avatarUrl: request.avatar_url,
    avatarClass: getAvatarClass(request.full_name),
    organization:
      request.organization_type ||
      request.department_name ||
      "Chưa cập nhật đơn vị",
    reason: request.reason || "Không có lý do đăng ký.",
    evidence: request.attachments.map((attachment) => ({
      id: attachment.attachment_id,
      name: attachment.file_name,
      url: attachment.url,
    })),
    submittedAt: request.submitted_at,
    status: request.status,
  };
}

export async function getOrganizerRequests({
  page,
  pageSize,
  search,
  status,
}) {
  const response = await api.get("/api/admin/organizer-requests", {
    params: {
      page,
      page_size: pageSize,
      search: search || undefined,
      status: status || undefined,
    },
  });

  return {
    ...response.data,
    items: response.data.items.map(mapOrganizerRequest),
  };
}

export async function getOrganizerRequest(requestId) {
  const response = await api.get(
    `/api/admin/organizer-requests/${requestId}`,
  );
  return mapOrganizerRequest(response.data);
}

export async function reviewOrganizerRequest(requestId, status) {
  const response = await api.patch(
    `/api/admin/organizer-requests/${requestId}/decision`,
    { status },
  );
  return {
    message: response.data.message,
    request: mapOrganizerRequest(response.data.request),
  };
}
