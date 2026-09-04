import { useEffect, useState } from "react"
import { ArrowRight, CalendarX2, Eye, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom"
import { cn } from "../lib/utils"
import { eventsApi } from "../api/eventApi.js"
import EventRemovalDialog from "./EventRemovalDialog.jsx"
import {
  formatDateTime,
  formatRegistered,
  getRemovalAction,
  getStatusDisplay,
  PENDING_REVISION_BADGE,
  REMOVAL_MODE,
} from "../utils/eventManagementUtils.js"

const headers = ["TÊN SỰ KIỆN", "THỜI GIAN", "TRẠNG THÁI", "NGƯỜI ĐĂNG KÝ", "THAO TÁC"]

// Dùng border-separate + border-t trên từng ô để thead sticky hoạt động ổn định
// (border-collapse làm mất viền khi hàng tiêu đề dính).
const cellCls = "border-t border-border px-6 py-3 [@media(min-height:820px)]:py-4"

export function EventsTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Sự kiện đang chờ xác nhận huỷ / xoá (null = không mở hộp thoại)
  const [pendingRemoval, setPendingRemoval] = useState(null)

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

  return (
    // KHÔNG dùng flex-1 / h-full: bảng cao đúng bằng nội dung, ít sự kiện thì khung
    // ngắn lại thay vì kéo dài ra hết màn hình.
    // Mặc định flex-shrink = 1, cộng với min-h-0, nên khi danh sách dài quá chỗ trống
    // thì khung vẫn tự co lại và phần thân bên trong cuộn — không tràn khỏi viewport.
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <h2 className="shrink-0 px-6 py-3 text-xl font-semibold text-foreground">Sự kiện Quản lý Gần đây</h2>

      {/* flex-auto (= flex: 1 1 auto) chứ không phải flex-1 (basis 0): cao theo nội dung,
          chỉ co lại và bật thanh cuộn khi thiếu chỗ. */}
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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={cn(cellCls, "text-center text-sm text-muted-foreground")}>
                  Chưa có sự kiện nào gần đây.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const status = getStatusDisplay(row.event_status)
                // Huỷ hay xoá là hai việc khác nhau — icon phải nói đúng việc
                const removal = getRemovalAction(row)
                const RemovalIcon =
                  removal.mode === REMOVAL_MODE.CANCEL ? CalendarX2 : Trash2
                return (
                  <tr key={row.event_id ?? row.title}>
                    {/* Cố định chiều rộng cột Tên sự kiện để chữ tự động xuống dòng gọn gàng */}
                    <td className={cn(cellCls, "text-[0.9375rem] font-medium text-foreground max-w-[320px]")}>
                      <div className="line-clamp-2">{row.title ?? "Sự kiện chưa có tên"}</div>
                    </td>

                    {/* Thời gian không bị xuống dòng */}
                    <td className={cn(cellCls, "text-sm text-muted-foreground whitespace-nowrap")}>
                      {formatDateTime(row.start_time)}
                    </td>

                    {/* Trạng thái không bị rớt chữ */}
                    <td className={cn(cellCls, "whitespace-nowrap")}>
                      {/* Có bản sửa đang chờ Admin duyệt thì chỉ hiện đúng một nhãn
                          "Chờ duyệt thay đổi" — trạng thái gốc bị ẩn để hàng không bị hai nhãn. */}
                      <span
                        className={cn(
                          "inline-flex rounded-md px-3 py-1.5 font-mono text-[0.8125rem] font-medium",
                          row.has_pending_revision
                            ? PENDING_REVISION_BADGE.className
                            : status.className,
                        )}
                      >
                        {row.has_pending_revision
                          ? PENDING_REVISION_BADGE.label
                          : status.label}
                      </span>
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
                            to={`/organizer/edit-event/${row.event_id}`}
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
                            onClick={() => setPendingRemoval(row)}
                            aria-label={`${removal.actionLabel} ${row.title}`}
                            title={removal.confirmLabel}
                            className="hover:text-destructive"
                          >
                            <RemovalIcon className="size-[18px]" aria-hidden="true" />
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


      {/* Xoá thì bỏ hàng khỏi bảng; huỷ thì sự kiện vẫn còn (trạng thái "Đã
          huỷ") nên chỉ thay bản ghi tại chỗ. */}
      <EventRemovalDialog
        event={pendingRemoval}
        onClose={() => setPendingRemoval(null)}
        onDeleted={(eventId) =>
          setRows((prev) => prev.filter((row) => row.event_id !== eventId))
        }
        onCancelled={(updated) =>
          setRows((prev) =>
            prev.map((row) =>
              row.event_id === updated.event_id ? { ...row, ...updated } : row,
            ),
          )
        }
      />

      {/* Footer luôn dính đáy bảng, không bị đẩy khỏi màn hình */}
      <div className="flex shrink-0 justify-end border-t border-border px-6 py-3">
        <Link
          to="/organizer/all-events"
          className="inline-flex items-center gap-1.5 font-mono text-[0.9375rem] font-medium text-primary transition-colors hover:text-primary/80"
        >
          Xem tất cả sự kiện
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
