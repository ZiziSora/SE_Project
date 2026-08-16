import { TopNav } from "../components/TopNav"
import { FullEventsTable } from "../components/FullEventTable"

export default function AllEvents() {
  return (
    // h-screen + overflow-hidden: khoá trang đúng bằng chiều cao màn hình để
    // không phải cuộn trang; phần dư (nếu có) do thân bảng tự cuộn bên trong.
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <TopNav />

      {/* min-h-0 bắt buộc phải có, nếu không flex item sẽ không chịu co lại.
          max-w-6xl: bảng rộng hơn nhưng vẫn nằm gọn trong khung trang. */}
      <div className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col px-2 py-4 md:px-8">
        <header className="mb-3 shrink-0">
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-foreground">Tất cả sự kiện</h1>
        </header>

        {/* Bảng chiếm hết chiều cao còn lại */}
        <div className="flex min-h-0 flex-1 flex-col">
          <FullEventsTable />
        </div>
      </div>
    </div>
  )
}
