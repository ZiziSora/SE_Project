import { useEffect, useState } from "react"
import { Calendar, CircleCheck, FileText, Send, ArrowRight, Eye, Pencil, Trash2, type LucideIcon } from "lucide-react"
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
  DRAFT: { label: "Bản nháp", className: "bg-blue-100 text-blue-600" },
  draft: { label: "Bản nháp", className: "bg-blue-100 text-blue-600" },
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

export function StatCards() {
  const [statsData, setStatsData] = useState({
    total: 0,
    published: 0,
    draft: 0,
    pending: 0,
  })
  const [rows, setRows] = useState<EventRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Lấy dữ liệu thống kê và 5 sự kiện gần đây từ Supabase
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Lỗi tải dữ liệu dashboard:', error.message)
      } else if (data) {
        // 1. Tính toán số liệu cho các thẻ thống kê
        let total = data.length
        let published = 0
        let draft = 0
        let pending = 0

        data.forEach((item) => {
          const st = (item.event_status || '').toUpperCase()
          if (st === 'PUBLISHED') published++
          else if (st === 'DRAFT') draft++
          else if (st === 'PENDING') pending++
        })

        setStatsData({ total, published, draft, pending })

        // 2. Lấy tối đa 5 sự kiện gần đây nhất cho bảng
        const recentEvents = data.slice(0, 5).map((item) => {
          const rawStatus = item.event_status || 'draft'
          const mappedStatus = statuses[rawStatus] || { label: rawStatus, className: "bg-gray-100 text-gray-600" }
          const canEdit = rawStatus.toUpperCase() === 'DRAFT' || rawStatus.toUpperCase() === 'PENDING'

          return {
            id: item.event_id || item.id,
            name: item.title || 'Sự kiện chưa có tên',
            time: item.start_time ? new Date(item.start_time).toLocaleString('vi-VN') : 'Chưa cập nhật',
            status: mappedStatus,
            registered: `0/${item.capacity || '∞'}`,
            canEdit: canEdit,
          }
        })

        setRows(recentEvents)
      }
      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  // Khai báo mảng stats dựa trên dữ liệu thật từ state
  const stats = [
    {
      title: "TỔNG SỰ KIỆN",
      value: statsData.total.toString(),
      icon: Calendar,
      circleClass: "bg-primary/85",
      iconClass: "text-primary-foreground",
    },
    {
      title: "ĐÃ XUẤT BẢN",
      value: statsData.published.toString(),
      icon: CircleCheck,
      circleClass: "bg-teal-100",
      iconClass: "text-teal-600",
    },
    {
      title: "BẢN NHÁP",
      value: statsData.draft.toString(),
      icon: FileText,
      circleClass: "bg-blue-100",
      iconClass: "text-blue-500",
    },
    {
      title: "CHỜ DUYỆT",
      value: statsData.pending.toString(),
      icon: Send,
      circleClass: "bg-yellow-100",
      iconClass: "text-yellow-500",
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── Phần Thẻ Thống Kê (StatCards) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="flex items-center justify-between overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-col gap-0">
                <p className="font-mono text-xs font-medium tracking-wider text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${stat.circleClass}`}>
                <Icon className={`size-5 ${stat.iconClass}`} aria-hidden="true" />
              </div>
            </div>
          )
        })}
      </div>

     </div>
  )
}