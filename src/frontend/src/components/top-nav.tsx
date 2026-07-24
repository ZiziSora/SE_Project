import { Bell, Plus } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

export function TopNav() {
  const location = useLocation()

  // Kiểm tra xem có đang ở trang tạo sự kiện không để ẩn nút
  const isCreateEventPage = location.pathname === "/create-event"

  // Định nghĩa danh sách các menu và đường dẫn tương ứng của chúng
  const navItems = [
    { label: "Trang chủ", path: "/" },
    { label: "Dashboard", path: "/manage-events" }, // Hoặc đường dẫn trang quản lý của bạn
    { label: "Quản lý người tham gia", path: "/participants" },
  ]

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-2.5 md:px-8">
      <div className="flex items-center gap-8">
        <span className="text-xl font-extrabold tracking-tight text-primary">UniEvent</span>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => {
            // Tự động active nếu đường dẫn hiện tại khớp với path của menu
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.label}
                to={item.path}
                className={
                  isActive
                    ? "relative pb-1 text-sm font-semibold text-primary after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary cursor-pointer"
                    : "pb-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {!isCreateEventPage && (
          <Link to="/create-event">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-2.5 py-1 font-mono text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
            >
              <Plus className="size-3" aria-hidden="true" />
              Tạo sự kiện mới
            </button>
          </Link>
        )}

        <button
          type="button"
          aria-label="Thông báo"
          className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          <Bell className="size-5" aria-hidden="true" />
        </button>
        <img
          src="/avatar.png"
          alt="Ảnh đại diện người dùng"
          className="size-9 rounded-full object-cover ring-2 ring-accent cursor-pointer"
        />
      </div>
    </header>
  )
}