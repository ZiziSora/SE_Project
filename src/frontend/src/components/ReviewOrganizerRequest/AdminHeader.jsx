import { useState } from "react";
import { Bell, Menu, ShieldCheck, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

const ADMIN_NAV_ITEMS = [
  { label: "Xét duyệt sự kiện", to: "/admin/manage-events" },
  { label: "Xét duyệt Ban tổ chức", to: "/admin/organizer-requests" },
  { label: "Thống kê", to: "/admin/statistics" },
];

export default function AdminHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4dfeb] bg-[#f8f9ff]/90 backdrop-blur-xl">
      <div className="mx-auto grid h-[72px] w-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 lg:px-16">
        <Link
          to="/admin/organizer-requests"
          className="flex w-fit items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7c3aed]"
        >
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#7c3aed] font-['Manrope'] text-sm font-bold text-white shadow-[0_7px_18px_rgba(124,58,237,0.24)]">
            U
          </span>
          <span className="font-['Manrope'] text-xl font-bold tracking-[-0.035em] text-[#1e293b]">
            Uni<span className="text-[#7c3aed]">Event</span>
          </span>
        </Link>

        <nav
          className="hidden items-center rounded-full border border-[#ded6e8] bg-white/80 p-1 shadow-[0_8px_28px_rgba(48,32,68,0.06)] md:flex"
          aria-label="Điều hướng quản trị"
        >
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[#efe7ff] text-[#6320c8] shadow-[inset_0_0_0_1px_rgba(124,58,237,0.08)]"
                    : "text-[#625a6c] hover:bg-[#f7f4fa] hover:text-[#332b3c]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-self-end gap-2.5">
          <div className="hidden items-center gap-2 rounded-full border border-[#ddd5e7] bg-white px-3.5 py-2 text-xs font-semibold text-[#4e4658] shadow-[0_5px_18px_rgba(38,25,53,0.04)] sm:flex">
            <ShieldCheck className="size-4 text-[#7c3aed]" strokeWidth={2} aria-hidden="true" />
            Quản trị viên
          </div>
          <button
            type="button"
            aria-label="Thông báo"
            className="relative grid size-10 place-items-center rounded-full border border-[#ddd5e7] bg-white text-[#4e4658] shadow-[0_5px_18px_rgba(38,25,53,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bca9d4] hover:text-[#6d20df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
          >
            <Bell className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            <span className="absolute right-[9px] top-[8px] size-1.5 rounded-full bg-[#7c3aed] ring-2 ring-white" />
          </button>
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="grid size-10 place-items-center rounded-full border border-[#ddd5e7] bg-white text-[#4e4658] md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          className="border-t border-[#e7e1ed] bg-white px-5 py-3 md:hidden"
          aria-label="Điều hướng quản trị trên di động"
        >
          <div className="mx-auto space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-3 text-sm font-semibold ${
                    isActive
                      ? "bg-[#efe7ff] text-[#6320c8]"
                      : "text-[#51495b] hover:bg-[#f7f4fa]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
