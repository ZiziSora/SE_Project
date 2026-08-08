import { TopNav } from "../components/top-nav"
import { StatCards } from "../components/stat-cards"
import { EventsTable } from "../components/events-table"


export default function ManageEvents() {
  return (
    <div className="min-h-screen bg-background ">
      <TopNav />
      <main className="w-full">
        
        
        {/* Đổi py-8 thành py-4 để thu gọn lề trên dưới của toàn trang */}
        <div className="mx-auto max-w-5xl px-2 py-4 md:px-10">
          
          {/* Đổi mb-8 thành mb-4 để kéo tiêu đề gần lại với thẻ thống kê */}
          <header className="mb-5">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground text-balance">
              Tổng quan Dashboard
            </h1>
          </header>

          {/* Đổi mb-8 thành mb-4 để kéo bảng gần lại với thẻ thống kê */}
          <div className="mb-4">
            <StatCards />
          </div>

          <EventsTable />
        </div>
      </main>
    </div>
  )
}