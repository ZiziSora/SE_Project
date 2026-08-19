import { useEffect, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Pencil, Search, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { cn } from "../lib/utils"
import { eventsApi } from "../api/eventApi.js"
import ConfirmDialog from "./ConfirmDialog.jsx"
import {
  extractApiErrorMessage,
  FILTER_TO_STATUS,
  formatDateTime,
  formatRegistered,
  getStatusDisplay,
  PENDING_REVISION_BADGE,
} from "../utils/eventManagementUtils.js"

const filters = ["Tất cả", "Đang mở đăng ký", "Đang diễn ra", "Chờ duyệt", "Bản nháp", "Đã kết thúc", "Đã hủy"]
const headers = ["TÊN SỰ KIỆN", "THỜI GIAN", "TRẠNG THÁI", "NGƯỜI ĐĂNG KÝ", "THAO TÁC"]

const ITEMS_PER_PAGE = 5 // Số lượng sự kiện hiển thị tối đa trên 1 trang

// Dùng border-separate + border-t trên từng ô để thead sticky hoạt động ổn định
// (border-collapse làm hỏng viền khi header dính).
const cellCls = "border-t border-border px-6 py-3 [@media(min-height:820px)]:py-4"

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
  // Sự kiện đang chờ xác nhận xoá (null = không mở hộp thoại)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
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

  const confirmDelete = async () => {
    if (!pendingDelete?.event_id || isDeleting) return
    setIsDeleting(true)
    try {
      await eventsApi.remove(pendingDelete.event_id)
      setEvents((prev) => prev.filter((row) => row.event_id !== pendingDelete.event_id))
      toast.success("Đã xoá sự kiện thành công")
      setPendingDelete(null)
    } catch (err) {
      console.error("Lỗi xoá sự kiện:", err)
      toast.error(extractApiErrorMessage(err, "Không xoá được sự kiện."))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    // KHÔNG dùng h-full: khung cao đúng bằng nội dung nên ít sự kiện thì bảng
    // ngắn lại thay vì chừa một khoảng trống dưới hàng cuối. min-h-0 + shrink
    // mặc định vẫn cho phép co lại và bật thanh cuộn khi danh sách dài.
    <div className="flex min-h-0 flex-col gap-2.5">
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
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  "rounded-full cursor-pointer border px-4 py-1.5 font-mono text-[0.8125rem] font-medium transition-colors",
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

      {/* Table — cao theo số hàng thực tế, chỉ co lại và cuộn khi thiếu chỗ */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* flex-auto (= flex: 1 1 auto) chứ không phải flex-1 (basis 0): cao theo
            nội dung. min-h-0 + overflow-auto giữ scrollbar nằm trong bảng. */}
        <div className="min-h-0 flex-auto overflow-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left">
            {/* bg-card làm nền đục cho hàng tiêu đề khi dính, giữ nguyên tông màu secondary/60 */}
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="bg-secondary/60">
                {headers.map((header, i) => (
                  <th
                    key={header}
                    className={cn(
                      "px-6 py-3 font-mono text-[0.8125rem] font-medium tracking-wider text-muted-foreground [@media(min-height:820px)]:py-4",
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
                      <td className={cn(cellCls, "text-[0.9375rem] font-medium text-foreground max-w-[320px]")}>
                        <div className="line-clamp-2">{row.title}</div>
                      </td>

                      {/* Thời gian không bị xuống dòng */}
                      <td className={cn(cellCls, "text-sm text-muted-foreground whitespace-nowrap")}>
                        {formatDateTime(row.start_time)}
                      </td>

                      {/* Trạng thái không bị rớt chữ */}
                      <td className={cn(cellCls, "whitespace-nowrap")}>
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={cn(
                              "inline-flex rounded-md px-3 py-1.5 font-mono text-[0.8125rem] font-medium",
                              statusInfo.className,
                            )}
                          >
                            {statusInfo.label}
                          </span>
                          {/* Bản sửa đang chờ Admin duyệt — sự kiện vẫn chạy bản cũ */}
                          {row.has_pending_revision && (
                            <span
                              className={cn(
                                "inline-flex rounded-md px-2 py-0.5 font-mono text-[0.6875rem] font-medium",
                                PENDING_REVISION_BADGE.className,
                              )}
                            >
                              {PENDING_REVISION_BADGE.label}
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className={cn(
                          cellCls,
                          "text-right font-mono text-[0.9375rem] font-medium text-foreground whitespace-nowrap",
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
                              <Pencil className="size-[18px]" aria-hidden="true" />
                            </Link>
                          )}
                          <Link
                              to={`/organizer/events/${row.event_id}`}
                            aria-label={`Xem ${row.title}`}
                            className="hover:text-foreground"
                          >
                            <Eye className="size-[18px]" aria-hidden="true" />
                          </Link>
                          {row.can_delete !== false && (
                            <button
                              type="button"
                              onClick={() => setPendingDelete(row)}
                              aria-label={`Xóa ${row.title}`}
                              className="hover:text-destructive"
                            >
                              <Trash2 className="size-[18px]" aria-hidden="true" />
                            </button>
                          )}
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
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-3">
          <button
            type="button"
            aria-label="Trang trước"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="font-mono text-[0.9375rem] text-muted-foreground">
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

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tone="danger"
        icon={Trash2}
        title="Xoá sự kiện?"
        description="Sự kiện sẽ bị xoá khỏi hệ thống cùng toàn bộ dữ liệu đăng ký và điểm danh đi kèm. Thao tác này không thể hoàn tác."
        detailTitle={pendingDelete?.title ?? "Sự kiện chưa có tên"}
        detailSubtitle={pendingDelete?.event_id}
        confirmLabel="Xoá sự kiện"
        isSubmitting={isDeleting}
        onClose={() => !isDeleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
