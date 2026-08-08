import { Bell, Plus } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

/**
 * Mỗi mục menu quản một NHÓM route, không chỉ một đường dẫn duy nhất.
 * Nhờ vậy các trang con của Dashboard (danh sách tất cả sự kiện, tạo / sửa sự kiện)
 * vẫn giữ gạch chân ở mục "Dashboard".
 *
 * - `path`  : đường dẫn khi bấm vào menu
 * - `match` : danh sách tiền tố route thuộc về mục này
 *             (`exact: true` = chỉ khớp đúng chuỗi, dùng cho "/" để nó không nuốt mọi route)
 */
const navItems: {
  label: string
  path: string
  match: { prefix: string; exact?: boolean }[]
}[] = [
  {
    // Trang khám phá sự kiện dành cho sinh viên — chưa dựng, tạm để cùng "/"
    label: "Trang chủ",
    path: "/",
    match: [{ prefix: "/home", exact: true }],
  },
  {
    // Dashboard hiện đang là trang gốc "/" nên mục này quản luôn "/"
    label: "Dashboard",
    path: "/",
    match: [
      { prefix: "/", exact: true },
      { prefix: "/manage-events" },
      { prefix: "/all-events" },
      { prefix: "/create-event" },
      { prefix: "/edit-event" },
      { prefix: "/events" },
    ],
  },
  {
    label: "Quản lý người tham gia",
    path: "/participants",
    match: [{ prefix: "/participants" }, { prefix: "/check-in" }],
  },
]

function isActive(pathname: string, item: (typeof navItems)[number]): boolean {
  return item.match.some(({ prefix, exact }) =>
    exact ? pathname === prefix : pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function TopNav() {
  const location = useLocation()

  // Kiểm tra xem có đang ở trang tạo sự kiện không để ẩn nút
  const isCreateEventPage = location.pathname === "/create-event"

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-2.5 md:px-8">
      <div className="flex items-center gap-8">
        <span className="text-xl font-extrabold tracking-tight text-primary">UniEvent</span>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => {
            // Active khi route hiện tại thuộc nhóm route của mục menu
            const active = isActive(location.pathname, item)

            return (
              <Link
                key={item.label}
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={
                  active
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