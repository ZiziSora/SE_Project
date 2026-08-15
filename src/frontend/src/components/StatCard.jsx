import { useEffect, useState } from "react"
import { Calendar, CircleCheck, FileText, Send } from "lucide-react"
import { eventsApi } from "../api/eventApi.js"

const EMPTY_STATS = {
  total: 0,
  published: 0,
  draft: 0,
  pending: 0,
  ongoing: 0,
  ended: 0,
  cancelled: 0,
}

export function StatCards() {
  const [statsData, setStatsData] = useState(EMPTY_STATS)

  // Lấy số liệu thống kê từ endpoint GET /api/events/stats
  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const result = await eventsApi.stats()
        if (!cancelled) setStatsData(result)
      } catch (err) {
        console.error("Lỗi tải dữ liệu dashboard:", err)
      }
    }

    fetchStats()
    return () => {
      cancelled = true
    }
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
