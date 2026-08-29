import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
  GraduationCap,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { getMyProfile } from "../../api/profileApi.js";
import { logoutCurrentSession } from "../../utils/logoutSession.js";
import NotificationMenu from "../../components/NotificationMenu.jsx";

const ROLE_CONFIG = {
  student: {
    label: "Sinh viên",
    logoTo: "/explore",
    profilePath: "/account/student/profile",
    navLabel: "Điều hướng sinh viên",
    navItems: [
      { label: "Khám phá", to: "/explore", match: ["/explore", "/events"] },
      { label: "Sự kiện của tôi", to: "/my-events", match: ["/my-events"] },
    ],
  },
  organizer: {
    label: "Ban tổ chức",
    logoTo: "/organizer",
    profilePath: "/account/organizer/profile",
    navLabel: "Điều hướng Ban tổ chức",
    navItems: [
      {
        label: "Trang chủ",
        to: "/organizer/home",
        match: ["/organizer/home"],
      },
      {
        label: "Dashboard",
        to: "/organizer",
        exactMatch: ["/organizer"],
        match: [
          "/organizer/events",
          "/manage-events",
          "/organizer/all-events",
          "/organizer/create-event",
          "/organizer/edit-event",
        ],
      },
      {
        label: "Quản lý người tham gia",
        to: "/organizer/participants",
        match: ["/organizer/participants", "/organizer/check-in"],
      },
    ],
  },
  admin: {
    label: "Quản trị viên",
    logoTo: "/admin/organizer-requests",
    profilePath: null,
    navLabel: "Điều hướng quản trị",
    navItems: [
      {
        label: "Xét duyệt sự kiện",
        to: "/admin/manage-events",
        match: ["/admin/manage-events", "/admin/events"],
      },
      {
        label: "Xét duyệt Ban tổ chức",
        to: "/admin/organizer-requests",
        match: ["/admin/organizer-requests"],
      },
      {
        label: "Thống kê",
        to: "/admin/statistics",
        match: ["/admin/statistics"],
      },
    ],
  },
};

function routeMatches(pathname, item) {
  if (item.exactMatch?.includes(pathname)) return true;

  return item.match.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function RoleHeader({ role, avatarUrl: providedAvatarUrl }) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.student;
  const location = useLocation();
  const navigate = useNavigate();
  const accountMenuRef = useRef(null);
  const accountMenuTriggerRef = useRef(null);
  const [fetchedAvatarUrl, setFetchedAvatarUrl] = useState("");
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const avatarUrl = providedAvatarUrl ?? fetchedAvatarUrl;
  const displayedAvatarUrl = avatarUrl === failedAvatarUrl ? "" : avatarUrl;
  const isAdmin = role === "admin";
  const isOrganizer = role === "organizer";
  const showCreateAction = isOrganizer && location.pathname !== "/organizer/create-event";
  const RoleIcon = isAdmin
    ? ShieldCheck
    : isOrganizer
      ? Building2
      : GraduationCap;

  useEffect(() => {
    if (isAdmin || providedAvatarUrl !== undefined) return undefined;

    let isMounted = true;

    getMyProfile()
      .then((profile) => {
        if (isMounted) setFetchedAvatarUrl(profile.avatar_url || "");
      })
      .catch(() => {
        if (isMounted) setFetchedAvatarUrl("");
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, providedAvatarUrl]);

  useEffect(() => {
    if (!isAccountMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        accountMenuTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    const { logoutFailed } = await logoutCurrentSession();

    if (logoutFailed) {
      toast.warning(
        "Đã đăng xuất khỏi thiết bị này, nhưng không thể đồng bộ phiên với máy chủ.",
      );
    } else {
      toast.success("Đăng xuất thành công.");
    }

    navigate("/auth/login", { replace: true });
  };

  const handleNavigation = () => {
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/90 bg-card/90 font-inter backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-12 xl:px-16">
        <Link
          to={config.logoTo}
          className="flex w-fit shrink-0 items-center gap-1 rounded-xl text-[#630ED4] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#630ED4]"
          aria-label="UniEvent - về trang chính"
        >
          <GraduationCap className="h-7 w-7" aria-hidden="true" />
          <span className="font-manrope text-3xl font-bold tracking-[-0.03em]">
            UniEvent
          </span>
        </Link>

        <nav
          className="hidden items-center rounded-full border border-border bg-background/75 p-1 shadow-[0_8px_28px_rgba(48,32,68,0.06)] lg:flex"
          aria-label={config.navLabel}
        >
          {config.navItems.map((item) => {
            const active = routeMatches(location.pathname, item);

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleNavigation}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 xl:px-5 ${active
                    ? "bg-accent text-accent-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_8%,transparent)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-self-end gap-2 sm:gap-2.5">
          {showCreateAction && (
            <Link
              to="/organizer/create-event"
              className="hidden h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_color-mix(in_oklab,var(--primary)_20%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-flex"
            >
              <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
              Tạo sự kiện
            </Link>
          )}

          <NotificationMenu tone="neutral" />

          <div ref={accountMenuRef} className="relative">
            <button
              ref={accountMenuTriggerRef}
              type="button"
              onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              aria-label={`Mở menu tài khoản ${config.label}`}
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              className="group flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-card p-1 pr-2 text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-accent text-primary transition-transform duration-700 ease-out group-hover:scale-105">
                {displayedAvatarUrl ? (
                  <img
                    src={displayedAvatarUrl}
                    alt={`Ảnh đại diện ${config.label}`}
                    className="size-full object-cover"
                    onError={() => setFailedAvatarUrl(displayedAvatarUrl)}
                  />
                ) : (
                  <RoleIcon className="size-4" strokeWidth={2} aria-hidden="true" />
                )}
              </span>
              <span className="hidden text-xs font-semibold xl:inline">
                {config.label}
              </span>
              <ChevronDown
                className={`size-3.5 text-muted-foreground transition-transform duration-300 ${isAccountMenuOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {isAccountMenuOpen && (
              <div
                role="menu"
                aria-label="Tùy chọn tài khoản"
                className="absolute right-0 top-full z-60 mt-3 w-64 overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-[0_20px_55px_rgba(41,24,75,0.16)]"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                    <RoleIcon className="size-4" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Vai trò hiện tại
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {config.label}
                    </p>
                  </div>
                </div>

                {config.profilePath && (
                  <Link
                    to={config.profilePath}
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary transition-transform duration-700 ease-out group-hover:scale-105">
                      <Settings2 className="size-4" aria-hidden="true" />
                    </span>
                    Cài đặt tài khoản
                  </Link>
                )}

                <div className="mx-3 my-1 h-px bg-border" aria-hidden="true" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  aria-busy={isLoggingOut}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition-colors duration-200 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-red-50 text-red-700 transition-transform duration-700 ease-out group-hover:scale-105">
                    {isLoggingOut ? (
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
            className="grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
          >
            {isMobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <nav
          className="border-t border-border bg-card px-4 py-3 sm:px-8 lg:hidden"
          aria-label={`${config.navLabel} trên di động`}
        >
          <div className="mx-auto grid max-w-[1440px] gap-1">
            {config.navItems.map((item) => {
              const active = routeMatches(location.pathname, item);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={handleNavigation}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {showCreateAction && (
              <Link
                to="/organizer/create-event"
                onClick={handleNavigation}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground sm:hidden"
              >
                <Plus className="size-4" aria-hidden="true" />
                Tạo sự kiện
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}