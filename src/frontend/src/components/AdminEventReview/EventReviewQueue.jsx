import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  formatAdminReviewDate,
  formatAdminReviewTime,
} from "../../utils/adminEventReviewUtils.js";
import AdminReviewStatusBadge from "./AdminReviewStatusBadge.jsx";
import EventReviewPoster from "./EventReviewPoster.jsx";

export default function EventReviewQueue({
  events,
  currentPage,
  totalPages,
  displayStart,
  displayEnd,
  totalResults,
  onPageChange,
  onDecision,
}) {
  if (!events.length) {
    return (
      <div className="grid min-h-[330px] place-items-center px-6 text-center">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#f1ebfa] text-[#7652a5]">
            <CalendarDays className="size-6" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-['Cabinet_Grotesk','Manrope',sans-serif] text-lg font-bold text-[#1f2b3c]">
            Không có sự kiện chờ duyệt
          </h3>
          <p className="mt-1 text-sm text-[#817889]">
            Hàng chờ đang trống hoặc không có kết quả phù hợp với từ khóa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <div className="grid grid-cols-[minmax(250px,1.4fr)_minmax(190px,.95fr)_minmax(180px,.85fr)_135px_205px_72px] items-center gap-4 border-b border-[#e8e2ed] bg-[#faf9fc] px-6 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#807688]">
          <span>Sự kiện</span>
          <span>Ban tổ chức</span>
          <span>Thời gian & địa điểm</span>
          <span>Trạng thái</span>
          <span>Phê duyệt</span>
          <span>Chi tiết</span>
        </div>
        {events.map((event) => (
          <article
            key={event.id}
            className="group grid grid-cols-[minmax(250px,1.4fr)_minmax(190px,.95fr)_minmax(180px,.85fr)_135px_205px_72px] items-center gap-4 border-b border-[#ece7ef] px-6 py-5 transition-colors duration-300 last:border-b-0 hover:bg-[#fcfaff]"
          >
            <div className="flex min-w-0 items-center justify-start gap-3.5 text-left">
              <div className="shrink-0 overflow-hidden rounded-xl shadow-[0_6px_16px_rgba(32,19,49,0.12)]">
                <EventReviewPoster event={event} compact />
              </div>
              <div className="min-w-0 text-left">
                <Link
                  to={`/admin/events/${event.id}`}
                  className="line-clamp-2 text-sm font-bold leading-5 text-[#18263a] transition-colors hover:text-[#6d20df]"
                >
                  {event.title}
                </Link>
                <p className="mt-1 text-[11px] font-medium text-[#8a8192]">
                  {event.id} · {event.category}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-start gap-3 text-left">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8eef9] text-[11px] font-bold text-[#5f6f88]">
                {event.organizerInitials}
              </span>
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-semibold text-[#2b3545]">
                  {event.organizerName}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#847b8b]">
                  {event.organization}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-left text-[11px] text-[#645b6d]">
              <p className="flex items-center justify-start gap-1.5 font-semibold text-[#313a49]">
                <CalendarDays className="size-3.5 shrink-0 text-[#857b8e]" aria-hidden="true" />
                {formatAdminReviewDate(event.startTime)} · {formatAdminReviewTime(event.startTime)}
              </p>
              <p className="flex items-center justify-start gap-1.5">
                <MapPin className="size-3.5 shrink-0 text-[#857b8e]" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </p>
            </div>

            <div className="flex justify-start">
              <AdminReviewStatusBadge status={event.status} />
            </div>

            <div className="flex min-h-9 items-center justify-start gap-2">
              {event.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    onClick={() => onDecision(event, "approve")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6d20df] px-3.5 text-xs font-semibold text-white shadow-[0_7px_18px_rgba(109,32,223,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#5b16c2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
                  >
                    <Check className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
                    Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecision(event, "reject")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 text-xs font-semibold text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  >
                    <X className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
                    Từ chối
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-center">
              <Link
                to={`/admin/events/${event.id}`}
                aria-label={`Xem chi tiết ${event.title}`}
                className="grid size-9 place-items-center rounded-lg border border-[#ddd5e7] bg-white text-[#625a6c] transition-all hover:-translate-y-0.5 hover:border-[#bda8d6] hover:bg-[#f5f0fb] hover:text-[#6d20df]"
              >
                <Eye className="size-4" strokeWidth={1.9} aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="grid grid-flow-dense gap-3 p-4 lg:hidden">
        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-xl border border-[#e5dfea] bg-white p-4 shadow-[0_8px_22px_rgba(44,29,59,0.05)]"
          >
            <div className="flex gap-3">
              <div className="shrink-0 overflow-hidden rounded-xl">
                <EventReviewPoster event={event} compact />
              </div>
              <div className="min-w-0 flex-1">
                <AdminReviewStatusBadge status={event.status} />
                <Link
                  to={`/admin/events/${event.id}`}
                  className="mt-2 block line-clamp-2 text-sm font-bold leading-5 text-[#18263a]"
                >
                  {event.title}
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-1.5 border-t border-[#eee9f1] pt-3 text-xs text-[#6f6678]">
              <p>{event.organizerName} · {event.organization}</p>
              <p>{formatAdminReviewDate(event.startTime)} · {event.location}</p>
            </div>
            <div className="mt-4 flex gap-2">
              {event.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    onClick={() => onDecision(event, "approve")}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#6d20df] text-xs font-semibold text-white"
                  >
                    <Check className="size-3.5" aria-hidden="true" /> Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecision(event, "reject")}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-300 text-xs font-semibold text-red-600"
                  >
                    <X className="size-3.5" aria-hidden="true" /> Từ chối
                  </button>
                </>
              )}
              <Link
                to={`/admin/events/${event.id}`}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ddd5e7] text-xs font-semibold text-[#5e5567]"
              >
                <Eye className="size-3.5" aria-hidden="true" /> Chi tiết
              </Link>
            </div>
          </article>
        ))}
      </div>

      <footer className="flex flex-col gap-3 border-t border-[#e8e2ed] bg-[#faf9fc] px-5 py-4 text-xs text-[#776e80] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Hiển thị <strong className="text-[#403748]">{displayStart}–{displayEnd}</strong> trong tổng số <strong className="text-[#403748]">{totalResults}</strong> sự kiện
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Trang trước"
            className="grid size-8 place-items-center rounded-full border border-[#ddd5e7] bg-white text-[#625a6c] transition-colors hover:border-[#bda8d6] hover:text-[#6d20df] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="min-w-16 text-center font-semibold text-[#4b4253]">
            {currentPage}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Trang sau"
            className="grid size-8 place-items-center rounded-full border border-[#ddd5e7] bg-white text-[#625a6c] transition-colors hover:border-[#bda8d6] hover:text-[#6d20df] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </>
  );
}
