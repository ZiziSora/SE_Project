import { useEffect, useState } from "react"
import { ArrowRight, Eye, Pencil, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

type Status = {
  label: string
  className: string
}

type EventRow = {
  id: string
  name: string
  time: string
  status: Status
  registered: string
  canEdit: boolean
}

const statuses: Record<string, Status> = {
  DRAFT: { label: "Bản nháp", className: "bg-gray-100 text-gray-600" },
  draft: { label: "Bản nháp", className: "bg-gray-100 text-gray-600" },
  PENDING: { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700" },
  pending: { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700" },
  PUBLISHED: { label: "Đang mở đăng ký", className: "bg-teal-100 text-teal-700" },
  published: { label: "Đang mở đăng ký", className: "bg-teal-100 text-teal-700" },
  ENDED: { label: "Đã kết thúc", className: "bg-slate-100 text-slate-600" },
  ended: { label: "Đã kết thúc", className: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-600" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-600" },
}

const headers = ["TÊN SỰ KIỆN", "THỜI GIAN", "TRẠNG THÁI", "NGƯỜI ĐĂNG KÝ", "THAO TÁC"]

export function EventsTable() {
  const [rows, setRows] = useState<EventRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function fetchRecentEvents() {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Lỗi tải 5 sự kiện gần đây:', error.message)
      } else if (data) {
        const formattedRows: EventRow[] = data.map((item) => {
          const rawStatus = item.event_status || 'draft'
          const mappedStatus = statuses[rawStatus] || { label: rawStatus, className: "bg-gray-100 text-gray-600" }
          
          const canEdit = rawStatus === 'draft' || rawStatus === 'DRAFT' || rawStatus === 'pending' || rawStatus === 'PENDING'

          return {
            id: item.event_id || item.id,
            name: item.title || 'Sự kiện chưa có tên',
            time: item.start_time ? new Date(item.start_time).toLocaleString('vi-VN') : 'Chưa cập nhật',
            status: mappedStatus,
            registered: `0/${item.capacity || '∞'}`,
            canEdit: canEdit,
          }
        })

        setRows(formattedRows)
      }
      setLoading(false)
    }

    fetchRecentEvents()
  }, [])

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <h2 className="px-6 py-3 text-lg font-semibold text-foreground">Sự kiện Quản lý Gần đây</h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="bg-secondary/60">
              {headers.map((header, i) => (
                <th
                  key={header}
                  className={`px-6 py-3 font-mono text-xs font-medium tracking-wider text-muted-foreground ${
                    i === 3 || i === 4 ? "text-right" : ""
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">
                  Chưa có sự kiện nào gần đây.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  {/* Cố định chiều rộng cột Tên sự kiện để chữ tự động xuống dòng gọn gàng */}
                  <td className="px-6 py-3.25 text-sm font-medium text-foreground max-w-[280px]">
                    <div className="line-clamp-2">{row.name}</div>
                  </td>

                  {/* Thêm whitespace-nowrap để Thời gian không bị xuống dòng */}
                  <td className="px-6 py-3.25 text-xs text-muted-foreground whitespace-nowrap">
                    {row.time}
                  </td>

                  {/* Thêm whitespace-nowrap để Status không bị rớt chữ */}
                  <td className="px-6 py-3.25 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-md px-2.5 py-1 font-mono text-xs font-medium ${row.status.className}`}
                    >
                      {row.status.label}
                    </span>
                  </td>

                  <td className="px-6 py-3.25 text-right font-mono text-sm font-medium text-foreground whitespace-nowrap">
                    {row.registered}
                  </td>
                  
                  <td className="px-6 py-3.25 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-3 text-muted-foreground">
                      {row.canEdit && (
                        <button type="button" aria-label={`Chỉnh sửa ${row.name}`} className="hover:text-primary">
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                      )}
                      <button type="button" aria-label={`Xem ${row.name}`} className="hover:text-foreground">
                        <Eye className="size-4" aria-hidden="true" />
                      </button>
                      <button type="button" aria-label={`Xóa ${row.name}`} className="hover:text-destructive">
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t border-border px-6 py-4">
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