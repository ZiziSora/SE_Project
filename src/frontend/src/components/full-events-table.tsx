import { useEffect, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Pencil, Search, Trash2 } from "lucide-react"
import { cn } from "../lib/utils"
import { supabase } from "../lib/supabase"

const filters = ["Tất cả", "Đang mở đăng ký", "Đang diễn ra", "Chờ duyệt", "Bản nháp", "Đã kết thúc", "Đã hủy"]
const headers = ["TÊN SỰ KIỆN", "THỜI GIAN", "TRẠNG THÁI", "NGƯỜI ĐĂNG KÝ", "THAO TÁC"]

const ITEMS_PER_PAGE = 5 // Số lượng sự kiện hiển thị tối đa trên 1 trang

export function FullEventsTable() {
  const [activeFilter, setActiveFilter] = useState("Tất cả")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Lỗi tải sự kiện:', error.message)
      } else {
        setEvents(data || [])
      }
      setLoading(false)
    }

    fetchEvents()
  }, [])

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'draft':
        return { label: 'Bản nháp', className: 'bg-gray-100 text-gray-600' }
      case 'PENDING':
      case 'pending':
        return { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-700' }
      case 'PUBLISHED':
      case 'published':
        return { label: 'Đang mở đăng ký', className: 'bg-green-100 text-green-700' }
      case 'ONGOING':
      case 'ongoing':
        return { label: 'Đang diễn ra', className: 'bg-blue-100 text-blue-700' }
      case 'ENDED':
      case 'ended':
        return { label: 'Đã kết thúc', className: 'bg-gray-200 text-gray-700' }
      case 'CANCELLED':
      case 'cancelled':
        return { label: 'Đã hủy', className: 'bg-red-100 text-red-700' }
      default:
        return { label: status || 'Bản nháp', className: 'bg-gray-100 text-gray-600' }
    }
  }

  // 1. Lọc theo tìm kiếm và tab trạng thái
  const filteredEvents = events.filter((item) => {
    const matchesSearch = item.title?.toLowerCase().includes(search.toLowerCase())
    if (activeFilter === "Tất cả") return matchesSearch
    const statusObj = getStatusDisplay(item.event_status)
    return matchesSearch && statusObj.label === activeFilter
  })

  // 2. Tính toán tổng số trang động dựa trên số lượng sự kiện thực tế
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE) || 1

  // 3. Cắt mảng dữ liệu để chỉ hiển thị các sự kiện thuộc trang hiện tại (`page`)
  const startIndex = (page - 1) * ITEMS_PER_PAGE
  const currentEvents = filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-3">
      {/* Search + filters + sort */}
      <div className="rounded-xl border border-border bg-secondary/60 px-5 py-3">
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1) // Về trang 1 khi tìm kiếm
            }}
            placeholder="Tìm kiếm tên sự kiện..."
            aria-label="Tìm kiếm tên sự kiện"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {filters.map((filter) => {
            const isActive = filter === activeFilter
            return (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setActiveFilter(filter)
                  setPage(1) // Về trang 1 khi đổi bộ lọc
                }}
                className={cn(
                  "rounded-full cursor-pointer border px-4 py-1.5 font-mono text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {filter}
              </button>
            )
          })}

          <div className="ml-auto flex items-center gap-1">
            <span className="font-mono text-xs text-muted-foreground">Sắp xếp:</span>
            <div className="relative">
              <select
                aria-label="Sắp xếp sự kiện"
                className="h-9 appearance-none cursor-pointer rounded-lg border border-border bg-card pl-3 pr-8 font-mono text-xs font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option>Mới nhất</option>
                <option>Cũ nhất</option>
                <option>Tên A-Z</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div>
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="bg-secondary/60">
                {headers.map((header, i) => (
                  <th
                    key={header}
                    className={cn(
                      "px-6 py-3 font-mono text-xs font-medium tracking-wider text-muted-foreground",
                      (i === 3 || i === 4) && "text-right",
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : currentEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                    Không tìm thấy sự kiện nào.
                  </td>
                </tr>
              ) : (
                currentEvents.map((row) => {
                  const statusInfo = getStatusDisplay(row.event_status)
                  return (
                    <tr key={row.event_id || row.id} className="border-t border-border">
                      {/* Giới hạn chiều rộng cột Tên sự kiện để tự xuống dòng gọn gàng */}
                      <td className="px-6 py-3.25 text-sm font-medium text-foreground max-w-[280px]">
                        <div className="line-clamp-2">{row.title}</div>
                      </td>

                      {/* Thời gian không bị xuống dòng */}
                      <td className="px-6 py-3.25 text-xs text-muted-foreground whitespace-nowrap">
                        {row.start_time ? new Date(row.start_time).toLocaleString('vi-VN') : 'Chưa cập nhật'}
                      </td>

                      {/* Trạng thái không bị rớt chữ */}
                      <td className="px-6 py-3.25 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2.5 py-1 font-mono text-xs font-medium",
                            statusInfo.className,
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="px-6 py-3.25 text-right font-mono text-sm font-medium text-foreground whitespace-nowrap">
                        0 / {row.capacity || '∞'}
                      </td>

                      <td className="px-6 py-3.25 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3 text-muted-foreground">
                          <button type="button" aria-label={`Chỉnh sửa ${row.title}`} className="hover:text-primary">
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                          <button type="button" aria-label={`Xem ${row.title}`} className="hover:text-foreground">
                            <Eye className="size-4" aria-hidden="true" />
                          </button>
                          <button type="button" aria-label={`Xóa ${row.title}`} className="hover:text-destructive">
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination động (Chỉ xuất hiện trang tiếp theo khi số lượng sự kiện vượt ngưỡng ITEMS_PER_PAGE) */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-3">
          <button
            type="button"
            aria-label="Trang trước"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="font-mono text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Trang sau"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  )
}