import { useEffect, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Pencil, Search, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "../lib/utils"
import { eventsApi } from "../api/eventApi.js"
import {
  FILTER_TO_STATUS,
  formatDateTime,
  formatRegistered,
  getStatusDisplay,
} from "../utils/eventManagementUtils.js"

const filters = ["Tất cả", "Đang mở đăng ký", "Đang diễn ra", "Chờ duyệt", "Bản nháp", "Đã kết thúc", "Đã hủy"]
const headers = ["TÊN SỰ KIỆN", "THỜI GIAN", "TRẠNG THÁI", "NGƯỜI ĐĂNG KÝ", "THAO TÁC"]

const ITEMS_PER_PAGE = 5 // Số lượng sự kiện hiển thị tối đa trên 1 trang

// Dùng border-separate + border-t trên từng ô để thead sticky hoạt động ổn định
// (border-collapse làm hỏng viền khi header dính).
const cellCls = "border-t border-border px-6 py-2.5"

const sortOptions = [
  { label: "Mới nhất", value: "newest" },
  { label: "Cũ nhất", value: "oldest" },
  { label: "Tên A-Z", value: "title" },
]

export function FullEventsTable() {
  const [activeFilter, setActiveFilter] = useState("Tất cả")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("newest")
  const [page, setPage] = useState(1)

  const [events, setEvents] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Gọi backend mỗi khi đổi từ khoá / bộ lọc / sắp xếp / trang (có debounce cho ô tìm kiếm)
  useEffect(() => {
    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await eventsApi.list({
          search: search || undefined,
          status: FILTER_TO_STATUS[activeFilter],
          sort,
          page,
          page_size: ITEMS_PER_PAGE,
        })
        if (cancelled) return
        setEvents(result.items)
        setTotalPages(result.total_pages)
      } catch (err) {
        console.error("Lỗi tải sự kiện:", err)
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được dữ liệu.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, search ? 300 : 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, activeFilter, sort, page])

  const handleDelete = async (event) => {
    if (!event.event_id) return
    if (!window.confirm(`Xoá sự kiện "${event.title}"?`)) return
    try {
      await eventsApi.remove(event.event_id)
      setEvents((prev) => prev.filter((row) => row.event_id !== event.event_id))
    } catch (err) {
      alert("Không xoá được sự kiện: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    // h-full + min-h-0: nhận chiều cao từ trang cha và cho phép con co lại được
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Search + filters + sort — chiều cao cố định, không co giãn */}
      <div className="shrink-0 rounded-xl border border-border bg-secondary/60 px-5 py-2.5">
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
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
                  "rounded-full cursor-pointer border px-4 py-1 font-mono text-xs font-medium transition-colors",
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
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value)
                  setPage(1)
                }}
                className="h-8 appearance-none cursor-pointer rounded-lg border border-border bg-card pl-3 pr-8 font-mono text-xs font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table — chiếm hết phần chiều cao còn lại, phần thân tự cuộn bên trong */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* min-h-0 + overflow-auto: scrollbar nằm trong bảng thay vì đẩy dài cả trang */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
            {/* bg-card làm nền đục cho hàng tiêu đề khi dính, giữ nguyên tông màu secondary/60 */}
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="bg-secondary/60">
                {headers.map((header, i) => (
                  <th
                    key={header}
                    className={cn(
                      "px-6 py-2.5 font-mono text-xs font-medium tracking-wider text-muted-foreground",
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
                  <td colSpan={5} className={cn(cellCls, "text-center text-sm text-muted-foreground")}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className={cn(cellCls, "text-center text-sm text-destructive")}>
                    {error}
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className={cn(cellCls, "text-center text-sm text-muted-foreground")}>
                    Không tìm thấy sự kiện nào.
                  </td>
                </tr>
              ) : (
                events.map((row) => {
                  const statusInfo = getStatusDisplay(row.event_status)
                  return (
                    <tr key={row.event_id ?? row.title}>
                      {/* Giới hạn chiều rộng cột Tên sự kiện để tự xuống dòng gọn gàng */}
                      <td className={cn(cellCls, "text-sm font-medium text-foreground max-w-[280px]")}>
                        <div className="line-clamp-2">{row.title}</div>
                      </td>

                      {/* Thời gian không bị xuống dòng */}
                      <td className={cn(cellCls, "text-xs text-muted-foreground whitespace-nowrap")}>
                        {formatDateTime(row.start_time)}
                      </td>

                      {/* Trạng thái không bị rớt chữ */}
                      <td className={cn(cellCls, "whitespace-nowrap")}>
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2.5 py-1 font-mono text-xs font-medium",
                            statusInfo.className,
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      <td
                        className={cn(
                          cellCls,
                          "text-right font-mono text-sm font-medium text-foreground whitespace-nowrap",
                        )}
                      >
                        {formatRegistered(row)}
                      </td>

                      <td className={cn(cellCls, "whitespace-nowrap")}>
                        <div className="flex items-center justify-end gap-3 text-muted-foreground">
                          {row.can_edit && (
                            <Link
                              to={`/edit-event/${row.event_id}`}
                              aria-label={`Chỉnh sửa ${row.title}`}
                              className="hover:text-primary"
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                            </Link>
                          )}
                          <Link
                              to={`/organizer/events/${row.event_id}`}
                            aria-label={`Xem ${row.title}`}
                            className="hover:text-foreground"
                          >
                            <Eye className="size-4" aria-hidden="true" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            aria-label={`Xóa ${row.title}`}
                            className="hover:text-destructive"
                          >
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

        {/* Pagination — tổng số trang do backend tính và trả về trong total_pages */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-2">
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
