import { useEffect, useState } from "react"
import { ArrowRight, Eye, Pencil, QrCode, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { cn } from "../lib/utils"
import { eventsApi } from "../api/eventApi.js"
import {
  formatDateTime,
  formatRegistered,
  getStatusDisplay,
} from "../utils/eventManagementUtils.js"

const headers = ["TÊN SỰ KIỆN", "THỜI GIAN", "TRẠNG THÁI", "NGƯỜI ĐĂNG KÝ", "THAO TÁC"]

// Dùng border-separate + border-t trên từng ô để thead sticky hoạt động ổn định
// (border-collapse làm mất viền khi hàng tiêu đề dính).
const cellCls = "border-t border-border px-6 py-2.5"

export function EventsTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchRecentEvents() {
      setLoading(true)
      try {
        const result = await eventsApi.list({ sort: "newest", page: 1, page_size: 5 })
        if (!cancelled) setRows(result.items)
      } catch (err) {
        console.error("Lỗi tải 5 sự kiện gần đây:", err)
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được dữ liệu.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRecentEvents()
    return () => {
      cancelled = true
    }
  }, [])

  const handleDelete = async (event) => {
    if (!event.event_id) return
    if (!window.confirm(`Xoá sự kiện "${event.title}"?`)) return
    try {
      await eventsApi.remove(event.event_id)
      setRows((prev) => prev.filter((row) => row.event_id !== event.event_id))
      toast.success("Đã xoá sự kiện thành công")
    } catch (err) {
      console.error("Lỗi xoá sự kiện:", err)
      toast.error(
        "Không xoá được sự kiện: " + (err instanceof Error ? err.message : String(err)),
      )
    }
  }

  return (
    // KHÔNG dùng flex-1 / h-full: bảng cao đúng bằng nội dung, ít sự kiện thì khung
    // ngắn lại thay vì kéo dài ra hết màn hình.
    // Mặc định flex-shrink = 1, cộng với min-h-0, nên khi danh sách dài quá chỗ trống
    // thì khung vẫn tự co lại và phần thân bên trong cuộn — không tràn khỏi viewport.
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <h2 className="shrink-0 px-6 py-2.5 text-lg font-semibold text-foreground">Sự kiện Quản lý Gần đây</h2>

      {/* flex-auto (= flex: 1 1 auto) chứ không phải flex-1 (basis 0): cao theo nội dung,
          chỉ co lại và bật thanh cuộn khi thiếu chỗ. */}
      <div className="min-h-0 flex-auto overflow-auto">
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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={cn(cellCls, "text-center text-sm text-muted-foreground")}>
                  Chưa có sự kiện nào gần đây.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const status = getStatusDisplay(row.event_status)
                return (
                  <tr key={row.event_id ?? row.title}>
                    {/* Cố định chiều rộng cột Tên sự kiện để chữ tự động xuống dòng gọn gàng */}
                    <td className={cn(cellCls, "text-sm font-medium text-foreground max-w-[280px]")}>
                      <div className="line-clamp-2">{row.title ?? "Sự kiện chưa có tên"}</div>
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
                          status.className,
                        )}
                      >
                        {status.label}
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
                        <Link
                          to={`/organizer/events/${row.event_id}/checkin`}
                          aria-label={`Điểm danh check-in ${row.title}`}
                          title="Điểm danh Check-in"
                          className="hover:text-purple-600 text-purple-700 font-bold flex items-center gap-1"
                        >
                          <QrCode className="size-4" aria-hidden="true" />
                        </Link>
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

      {/* Footer luôn dính đáy bảng, không bị đẩy khỏi màn hình */}
      <div className="flex shrink-0 justify-end border-t border-border px-6 py-2.5">
        <Link
          to="/all-events"
          className="inline-flex items-center gap-1.5 font-mono text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Xem tất cả sự kiện
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
