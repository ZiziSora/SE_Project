import { useEffect, useState } from "react"
import { Bell, LoaderCircle, LogOut, Plus, UserRound } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { logout } from "../api/authApi.js"
import { getMyProfile } from "../api/profileApi.js"
import { supabase } from "../lib/supabase.js"
import { clearStoredAuthentication } from "../utils/authStorage.js"

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
  const [fetchedAvatarUrl, setFetchedAvatarUrl] = useState("")
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("")
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

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    let logoutFailed = false

    try {
      await logout()
    } catch {
      logoutFailed = true
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" })
      logoutFailed = logoutFailed || Boolean(error)
    } catch {
      logoutFailed = true
    }

    clearStoredAuthentication()

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
        <Link
          to="/account/organizer/profile"
          aria-label="Mở trang hồ sơ Ban tổ chức"
          title="Hồ sơ Ban tổ chức"
          className="grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full bg-accent text-primary ring-2 ring-accent transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
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
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label={isLoggingOut ? "Đang đăng xuất" : "Đăng xuất"}
          aria-busy={isLoggingOut}
          className="group inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
        >
          {isLoggingOut ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut
              className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          )}
          <span className="hidden sm:inline">
            {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </span>
        </button>
      </div>
    </header>
  )
}
