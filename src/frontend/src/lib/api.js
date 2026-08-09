/**
 * Lớp giao tiếp duy nhất giữa Frontend và Backend Python (FastAPI).
 *
 * Toàn bộ code gọi Supabase đã được chuyển sang backend.
 * Các component chỉ import từ file này, không import supabase-js nữa.
 *
 * Cấu hình: tạo file .env ở thư mục frontend với dòng
 *   VITE_API_BASE_URL=http://localhost:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

// ─── Hình dạng dữ liệu (chỉ để tham khảo, không ràng buộc lúc chạy) ───────────
//
// Trạng thái sự kiện: "DRAFT" | "PENDING" | "PUBLISHED" | "ONGOING" | "ENDED" | "CANCELLED"
//
// EventDTO (backend trả về):
//   event_id, title, category_id, category_name, location,
//   start_time, end_time, registration_deadline, capacity,
//   registered_count, seats_left, is_full, is_registration_open,
//   description, banner_url,
//   file_url            → URL tài liệu kế hoạch (bucket `event_plan`)
//   event_status, can_edit,
//   requires_reapproval → true khi sửa nội dung sẽ bị đưa về PENDING
//   created_at
//
// EventListDTO: { items, total, page, page_size, total_pages }
// CategoryDTO : { category_id, name }
// StatsDTO    : { total, published, draft, pending, ongoing, ended, cancelled }
// UploadDTO   : { url, path, bucket, size, content_type }

/** Lỗi có thông điệp tiếng Việt lấy từ backend, dùng để hiển thị cho người dùng. */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   */
  constructor(message, status) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

/**
 * @param {string} path
 * @param {RequestInit} [init]
 * @returns {Promise<any>}
 */
async function request(path, init = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers:
        init.body instanceof FormData
          ? init.headers
          : { "Content-Type": "application/json", ...(init.headers ?? {}) },
    })
  } catch {
    throw new ApiError("Không kết nối được tới máy chủ. Kiểm tra backend đã chạy chưa.", 0)
  }

  if (response.status === 204) return undefined

  const text = await response.text()
  const body = text ? safeJsonParse(text) : null

  if (!response.ok) {
    const detail =
      (body && typeof body === "object" && "detail" in body ? String(body.detail) : null) ??
      `Lỗi ${response.status}`
    throw new ApiError(detail, response.status)
  }

  return body
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function toQueryString(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value))
    }
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

// ─── Events ───────────────────────────────────────────────────────────────────

export const eventsApi = {
  /**
   * @param {{ search?: string, status?: string, organizer_id?: string,
   *           sort?: "newest"|"oldest"|"title"|"created",
   *           page?: number, page_size?: number }} [params]
   */
  list(params = {}) {
    return request(`/api/events${toQueryString(params)}`)
  },

  get(eventId) {
    return request(`/api/events/${eventId}`)
  },

  stats(organizerId) {
    return request(`/api/events/stats${toQueryString({ organizer_id: organizerId })}`)
  },

  locations() {
    return request("/api/events/locations")
  },

  create(payload) {
    return request("/api/events", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  update(eventId, payload) {
    return request(`/api/events/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  changeStatus(eventId, eventStatus) {
    return request(`/api/events/${eventId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ event_status: eventStatus }),
    })
  },

  remove(eventId) {
    return request(`/api/events/${eventId}`, { method: "DELETE" })
  },
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list() {
    return request("/api/categories")
  },
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

export const uploadsApi = {
  /** Ảnh bìa → bucket `banner_event` */
  banner(file) {
    const form = new FormData()
    form.append("file", file)
    return request("/api/uploads/banner", { method: "POST", body: form })
  },

  /** Tài liệu kế hoạch (PDF/Word) → bucket `event_plan` */
  eventPlan(file) {
    const form = new FormData()
    form.append("file", file)
    return request("/api/uploads/event-plan", { method: "POST", body: form })
  },
}

// ─── Tiện ích hiển thị dùng chung cho các bảng ────────────────────────────────

export const STATUS_LABELS = {
  DRAFT: { label: "Bản nháp", className: "bg-blue-100 text-blue-600" },
  PENDING: { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700" },
  PUBLISHED: { label: "Đang mở đăng ký", className: "bg-teal-100 text-teal-700" },
  ONGOING: { label: "Đang diễn ra", className: "bg-blue-100 text-blue-700" },
  ENDED: { label: "Đã kết thúc", className: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-600" },
}

export function getStatusDisplay(status) {
  const key = (status ?? "DRAFT").toUpperCase()
  return (
    STATUS_LABELS[key] ?? { label: status ?? "Bản nháp", className: "bg-gray-100 text-gray-600" }
  )
}

/** Nhãn ở tab lọc → mã trạng thái backend. */
export const FILTER_TO_STATUS = {
  "Tất cả": undefined,
  "Đang mở đăng ký": "PUBLISHED",
  "Đang diễn ra": "ONGOING",
  "Chờ duyệt": "PENDING",
  "Bản nháp": "DRAFT",
  "Đã kết thúc": "ENDED",
  "Đã hủy": "CANCELLED",
}

export function formatDateTime(value) {
  if (!value) return "Chưa cập nhật"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Chưa cập nhật" : date.toLocaleString("vi-VN")
}

export function formatRegistered(event) {
  return `${event.registered_count}/${event.capacity ?? "∞"}`
}
