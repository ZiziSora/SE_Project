/**
 * Lớp giao tiếp duy nhất giữa Frontend và Backend Python (FastAPI).
 *
 * Toàn bộ code gọi Supabase đã được chuyển sang backend.
 * Các component chỉ import từ file này, không import supabase-js nữa.
 *
 * Cấu hình: tạo file .env ở thư mục frontend với dòng
 *   VITE_API_BASE_URL=http://localhost:8000
 */

const API_BASE_URL =
  ((import.meta as any).env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000"

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventStatus =
  | "DRAFT"
  | "PENDING"
  | "PUBLISHED"
  | "ONGOING"
  | "ENDED"
  | "CANCELLED"

export interface EventDTO {
  event_id: string | null
  title: string | null
  category_id: number | null
  category_name: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  registration_deadline: string | null
  capacity: number | null
  registered_count: number
  seats_left: number | null
  is_full: boolean
  is_registration_open: boolean
  description: string | null
  banner_url: string | null
  /** URL tài liệu kế hoạch — cột `file_url` trong DB, tệp nằm ở bucket `event_plan` */
  file_url: string | null
  event_status: EventStatus
  can_edit: boolean
  /** True khi sự kiện đang công khai: sửa nội dung sẽ bị đưa về PENDING chờ duyệt lại */
  requires_reapproval: boolean
  created_at: string | null
}

export interface EventListDTO {
  items: EventDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CategoryDTO {
  category_id: number
  name: string
}

export interface StatsDTO {
  total: number
  published: number
  draft: number
  pending: number
  ongoing: number
  ended: number
  cancelled: number
}

export interface UploadDTO {
  url: string
  path: string
  bucket: string
  size: number
  content_type: string
}

export interface EventPayload {
  title?: string | null
  category_id?: number | null
  location?: string | null
  start_time?: string | null
  end_time?: string | null
  registration_deadline?: string | null
  capacity?: number | null
  description?: string | null
  banner_url?: string | null
  file_url?: string | null
  event_status?: EventStatus
  organizer_id?: string | null
}

export interface ListEventsParams {
  search?: string
  status?: string
  organizer_id?: string
  sort?: "newest" | "oldest" | "title" | "created"
  page?: number
  page_size?: number
}

/** Lỗi có thông điệp tiếng Việt lấy từ backend, dùng để hiển thị cho người dùng. */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
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

  if (response.status === 204) return undefined as T

  const text = await response.text()
  const body = text ? safeJsonParse(text) : null

  if (!response.ok) {
    const detail =
      (body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : null) ?? `Lỗi ${response.status}`
    throw new ApiError(detail, response.status)
  }

  return body as T
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function toQueryString(params: Record<string, unknown>): string {
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
  list(params: ListEventsParams = {}): Promise<EventListDTO> {
    return request<EventListDTO>(`/api/events${toQueryString(params as any)}`)
  },

  get(eventId: string): Promise<EventDTO> {
    return request<EventDTO>(`/api/events/${eventId}`)
  },

  stats(organizerId?: string): Promise<StatsDTO> {
    return request<StatsDTO>(
      `/api/events/stats${toQueryString({ organizer_id: organizerId })}`,
    )
  },

  locations(): Promise<string[]> {
    return request<string[]>("/api/events/locations")
  },

  create(payload: EventPayload): Promise<EventDTO> {
    return request<EventDTO>("/api/events", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  update(eventId: string, payload: EventPayload): Promise<EventDTO> {
    return request<EventDTO>(`/api/events/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  changeStatus(eventId: string, eventStatus: EventStatus): Promise<EventDTO> {
    return request<EventDTO>(`/api/events/${eventId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ event_status: eventStatus }),
    })
  },

  remove(eventId: string): Promise<void> {
    return request<void>(`/api/events/${eventId}`, { method: "DELETE" })
  },
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list(): Promise<CategoryDTO[]> {
    return request<CategoryDTO[]>("/api/categories")
  },
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

export const uploadsApi = {
  /** Ảnh bìa → bucket `banner_event` */
  banner(file: File): Promise<UploadDTO> {
    const form = new FormData()
    form.append("file", file)
    return request<UploadDTO>("/api/uploads/banner", { method: "POST", body: form })
  },

  /** Tài liệu kế hoạch (PDF/Word) → bucket `event_plan` */
  eventPlan(file: File): Promise<UploadDTO> {
    const form = new FormData()
    form.append("file", file)
    return request<UploadDTO>("/api/uploads/event-plan", { method: "POST", body: form })
  },
}

// ─── Tiện ích hiển thị dùng chung cho các bảng ────────────────────────────────

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Bản nháp", className: "bg-blue-100 text-blue-600" },
  PENDING: { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700" },
  PUBLISHED: { label: "Đang mở đăng ký", className: "bg-teal-100 text-teal-700" },
  ONGOING: { label: "Đang diễn ra", className: "bg-blue-100 text-blue-700" },
  ENDED: { label: "Đã kết thúc", className: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-600" },
}

export function getStatusDisplay(status?: string | null) {
  const key = (status ?? "DRAFT").toUpperCase()
  return (
    STATUS_LABELS[key] ?? { label: status ?? "Bản nháp", className: "bg-gray-100 text-gray-600" }
  )
}

/** Nhãn ở tab lọc → mã trạng thái backend. */
export const FILTER_TO_STATUS: Record<string, string | undefined> = {
  "Tất cả": undefined,
  "Đang mở đăng ký": "PUBLISHED",
  "Đang diễn ra": "ONGOING",
  "Chờ duyệt": "PENDING",
  "Bản nháp": "DRAFT",
  "Đã kết thúc": "ENDED",
  "Đã hủy": "CANCELLED",
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Chưa cập nhật"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Chưa cập nhật" : date.toLocaleString("vi-VN")
}

export function formatRegistered(event: EventDTO): string {
  return `${event.registered_count}/${event.capacity ?? "∞"}`
}