import { TopNav } from "../components/TopNav.jsx"
import { StatCards } from "../components/StatCard.jsx"
import { EventsTable } from "../components/EventsTable.jsx"

export default function ManageEvents() {
  return (
    // h-screen + overflow-hidden: khoá trang đúng bằng chiều cao màn hình,
    // trình duyệt không còn thanh cuộn dọc. TopNav nằm ngoài vùng co giãn.
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <TopNav />

      {/* min-h-0 bắt buộc phải có, nếu không flex item sẽ không chịu co lại */}
      {/* max-w-6xl: bảng rộng hơn nhưng vẫn nằm gọn trong khung trang */}
      <main className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col px-2 py-4 md:px-8">

        {/* Tiêu đề và thẻ thống kê giữ nguyên chiều cao, không co giãn */}
        <header className="mb-3 shrink-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground text-balance">
            Tổng quan Dashboard
          </h1>
        </header>

        <div className="mb-3 shrink-0">
          <StatCards />
        </div>

        {/* Bảng chiếm hết chiều cao còn lại và tự cuộn bên trong */}
        <EventsTable />
      </main>
    </div>
  )
}
