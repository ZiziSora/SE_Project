import { useEffect, useRef, useState } from "react"
import {
  Bell,
  ChevronDown,
  LoaderCircle,
  LogOut,
  Plus,
  Settings2,
  UserRound,
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { getMyProfile } from "../api/profileApi.js"
import { logoutCurrentSession } from "../utils/logoutSession.js"

/**
 * Mỗi mục menu quản một NHÓM route, không chỉ một đường dẫn duy nhất.
 * Nhờ vậy các trang con của Dashboard (danh sách tất cả sự kiện, tạo / sửa / xem sự kiện)
 * vẫn giữ gạch chân ở mục "Dashboard".
 *
 * - `path`  : đường dẫn khi bấm vào menu
 * - `match` : danh sách tiền tố route thuộc về mục này
 *             (`exact: true` = chỉ khớp đúng chuỗi, dùng cho "/" để nó không nuốt mọi route)
 */
const navItems = [
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

function isActive(pathname, item) {
  return item.match.some(({ prefix, exact }) =>
    exact ? pathname === prefix : pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function TopNav({ avatarUrl: providedAvatarUrl }) {
  const location = useLocation()
  const navigate = useNavigate()
  const accountMenuRef = useRef(null)
  const accountMenuTriggerRef = useRef(null)
  const [fetchedAvatarUrl, setFetchedAvatarUrl] = useState("")
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("")
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const avatarUrl = providedAvatarUrl ?? fetchedAvatarUrl
  const displayedAvatarUrl = avatarUrl === failedAvatarUrl ? "" : avatarUrl

  // Kiểm tra xem có đang ở trang tạo sự kiện không để ẩn nút
  const isCreateEventPage = location.pathname === "/create-event"

  useEffect(() => {
    if (providedAvatarUrl !== undefined) {
      return undefined
    }

    let isMounted = true

    getMyProfile()
      .then((profile) => {
        if (isMounted) {
          setFetchedAvatarUrl(profile.avatar_url || "")
        }
      })
      .catch(() => {
        if (isMounted) {
          setFetchedAvatarUrl("")
        }
      })

    return () => {
      isMounted = false
    }
  }, [providedAvatarUrl])

  useEffect(() => {
    if (!isAccountMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false)
        accountMenuTriggerRef.current?.focus()
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isAccountMenuOpen])

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    const { logoutFailed } = await logoutCurrentSession()

    if (logoutFailed) {
      toast.warning(
        "Đã đăng xuất khỏi thiết bị này, nhưng không thể đồng bộ phiên với máy chủ.",
      )
    } else {
      toast.success("Đăng xuất thành công.")
    }

    navigate("/auth/login", { replace: true })
  }

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
        <div ref={accountMenuRef} className="relative">
          <button
            ref={accountMenuTriggerRef}
            type="button"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            aria-label="Mở menu tài khoản Ban tổ chức"
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
            className="group flex cursor-pointer items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-accent text-primary ring-2 ring-accent transition-transform duration-700 ease-out group-hover:scale-105">
              {displayedAvatarUrl ? (
                <img
                  src={displayedAvatarUrl}
                  alt="Ảnh đại diện Ban tổ chức"
                  className="size-full object-cover"
                  onError={() => setFailedAvatarUrl(displayedAvatarUrl)}
                />
              ) : (
                <UserRound className="size-5" aria-hidden="true" />
              )}
            </span>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform duration-300 ${isAccountMenuOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {isAccountMenuOpen && (
            <div
              role="menu"
              aria-label="Tùy chọn tài khoản"
              className="absolute top-full right-0 z-60 mt-3 w-60 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-[0_18px_48px_rgba(41,24,75,0.18)]"
            >
              <Link
                to="/account/organizer/profile"
                role="menuitem"
                onClick={() => setIsAccountMenuOpen(false)}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors duration-300 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                  <Settings2 className="size-4" aria-hidden="true" />
                </span>
                Cài đặt tài khoản
              </Link>

              <div className="mx-3 my-1 h-px bg-border" aria-hidden="true" />

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition-colors duration-300 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-red-50 text-red-700 transition-transform duration-300 group-hover:scale-105">
                  {isLoggingOut ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <LogOut className="size-4" aria-hidden="true" />
                  )}
                </span>
                {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
