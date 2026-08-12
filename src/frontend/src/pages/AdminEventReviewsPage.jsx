import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CircleX,
  ClipboardList,
  Filter,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import AdminEventDecisionDialog from "../components/AdminEventReview/AdminEventDecisionDialog.jsx";
import AdminReviewStatCard from "../components/AdminEventReview/AdminReviewStatCard.jsx";
import EventReviewQueue from "../components/AdminEventReview/EventReviewQueue.jsx";
import EventReviewPoster from "../components/AdminEventReview/EventReviewPoster.jsx";
import ReviewPolicyMarquee from "../components/AdminEventReview/ReviewPolicyMarquee.jsx";
import AdminHeader from "../components/ReviewOrganizerRequest/AdminHeader.jsx";
import {
  getAdminReviewEvents,
  getAdminReviewSummary,
  saveAdminReviewDecision,
} from "../lib/adminEventReviewStore.js";

const PAGE_SIZE = 4;

export default function AdminEventReviewsPage() {
  const [events, setEvents] = useState(getAdminReviewEvents);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [decision, setDecision] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const refreshEvents = () => setEvents(getAdminReviewEvents());
    window.addEventListener("storage", refreshEvents);
    window.addEventListener("unievent:admin-review-updated", refreshEvents);

    return () => {
      window.removeEventListener("storage", refreshEvents);
      window.removeEventListener("unievent:admin-review-updated", refreshEvents);
    };
  }, []);

  const summary = useMemo(() => getAdminReviewSummary(events), [events]);
  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("vi");

    return events.filter((event) => {
      const matchesStatus = statusFilter === "ALL" || event.status === statusFilter;
      const searchableText = [
        event.title,
        event.id,
        event.organizerName,
        event.organization,
        event.category,
        event.location,
      ]
        .join(" ")
        .toLocaleLowerCase("vi");

      return matchesStatus && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [events, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const visibleEvents = filteredEvents.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const featuredEvent = events.find((event) => event.status === "PENDING") ?? events[0];

  const updateSearchTerm = (value) => {
    setCurrentPage(1);
    setSearchTerm(value);
  };

  const updateStatusFilter = (value) => {
    setCurrentPage(1);
    setStatusFilter(value);
  };

  const confirmDecision = (reason) => {
    if (!decision || isSubmitting) return;

    setIsSubmitting(true);
    window.setTimeout(() => {
      const status = decision.action === "approve" ? "APPROVED" : "REJECTED";
      saveAdminReviewDecision(decision.event.id, status, reason);
      toast.success(
        status === "APPROVED"
          ? "Đã phê duyệt sự kiện."
          : "Đã từ chối và lưu phản hồi cho Ban tổ chức.",
      );
      setDecision(null);
      setIsSubmitting(false);
    }, 350);
  };

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8f9ff] font-['Inter',sans-serif] text-[#172235]">
      <AdminHeader />

      <section className="relative mx-auto w-full max-w-[1440px] px-5 pb-10 pt-10 sm:px-8 sm:pt-14 lg:px-16">
        <div className="pointer-events-none absolute -right-24 top-0 size-[430px] rounded-full bg-[#d9c5ff]/30 blur-[115px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-52 top-[360px] size-[360px] rounded-full bg-[#c9e9f4]/20 blur-[105px]" aria-hidden="true" />

        <section className="review-reveal relative z-10 grid items-end gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(330px,.6fr)]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#6d20df]">
              <ShieldCheck className="size-4" strokeWidth={2} aria-hidden="true" />
              Trung tâm kiểm duyệt
            </div>
            <h1 className="mt-5 max-w-5xl font-['Cabinet_Grotesk','Manrope',sans-serif] text-[clamp(2.55rem,5.2vw,4.8rem)] font-bold leading-[1.02] tracking-[-0.06em] text-[#142033]">
              Kiểm duyệt sự kiện
              trước khi xuất bản
            </h1>
            <p className="mt-5 max-w-2xl text-[clamp(.95rem,1.4vw,1.08rem)] leading-7 text-[#6c6375]">
              Kiểm tra nội dung, lịch trình và hồ sơ kế hoạch để mỗi sự kiện đến với sinh viên đều rõ ràng, an toàn và đáng tin cậy.
            </p>
          </div>
          <aside className="border-l-2 border-[#7c3aed] pl-5 lg:mb-1 lg:justify-self-end lg:max-w-[340px]">
            <p className="text-sm leading-6 text-[#6b6275]">
              Hồ sơ chờ duyệt lâu nhất đã được gửi hơn 24 giờ. Ưu tiên xử lý theo thời gian gửi để bảo đảm trải nghiệm cho Ban tổ chức.
            </p>
          </aside>
        </section>

        <section
          className="review-reveal relative z-10 mt-10 grid grid-flow-dense grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#ded7e7] bg-[#e8e2ee] shadow-[0_18px_50px_rgba(44,29,59,0.07)] md:grid-cols-4"
          style={{ animationDelay: "110ms" }}
          aria-label="Tổng quan kiểm duyệt"
        >
          <AdminReviewStatCard label="Tổng hồ sơ" value={summary.total} helper="Tất cả yêu cầu đã tiếp nhận" icon={ClipboardList} tone="blue" />
          <AdminReviewStatCard label="Đang chờ" value={summary.pending} helper="Cần quản trị viên xử lý" icon={CalendarClock} />
          <AdminReviewStatCard label="Đã duyệt" value={summary.approved} helper="Đủ điều kiện xuất bản" icon={CalendarCheck2} tone="green" />
          <AdminReviewStatCard label="Đã từ chối" value={summary.rejected} helper="Đã gửi phản hồi chỉnh sửa" icon={CircleX} tone="red" />
        </section>
      </section>


      <section className="mx-auto w-full max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-16">
        <div
          className="review-reveal overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_22px_65px_rgba(44,29,59,0.08)]"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex flex-col gap-5 border-b border-[#e7e1ec] px-5 py-5 sm:px-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-['Cabinet_Grotesk','Manrope',sans-serif] text-xl font-bold tracking-[-0.03em] text-[#172235]">
                  Hàng chờ xét duyệt
                </h2>
                <span className="rounded-full bg-[#eee7ff] px-2.5 py-1 text-xs font-semibold text-[#6d20df]">
                  {summary.pending}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#7a7183]">Sắp xếp theo thời gian gửi mới nhất.</p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <label className="relative block w-full sm:w-[320px]">
                <span className="sr-only">Tìm kiếm sự kiện</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#83798d]" aria-hidden="true" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(changeEvent) => updateSearchTerm(changeEvent.target.value)}
                  placeholder="Tìm sự kiện, Ban tổ chức..."
                  className="h-11 w-full rounded-xl border border-[#dcd4e3] bg-[#fbfaff] pl-10 pr-10 text-sm text-[#302839] outline-none transition-all placeholder:text-[#aaa1b2] focus:border-[#9b71db] focus:bg-white focus:ring-3 focus:ring-[#7c3aed]/10"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => updateSearchTerm("")}
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-[#918797] hover:bg-[#eee9f2]"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </label>
              <label className="relative block min-w-[190px]">
                <span className="sr-only">Lọc trạng thái</span>
                <Filter className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#83798d]" aria-hidden="true" />
                <select
                  value={statusFilter}
                  onChange={(changeEvent) => updateStatusFilter(changeEvent.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-[#dcd4e3] bg-[#fbfaff] pl-10 pr-9 text-sm font-medium text-[#51495b] outline-none focus:border-[#9b71db] focus:bg-white focus:ring-3 focus:ring-[#7c3aed]/10"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">Đang chờ duyệt</option>
                  <option value="APPROVED">Đã phê duyệt</option>
                  <option value="REJECTED">Đã từ chối</option>
                </select>
              </label>
            </div>
          </div>

          <EventReviewQueue
            events={visibleEvents}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            displayStart={filteredEvents.length ? pageStartIndex + 1 : 0}
            displayEnd={filteredEvents.length ? pageStartIndex + visibleEvents.length : 0}
            totalResults={filteredEvents.length}
            onPageChange={setCurrentPage}
            onDecision={(event, action) => setDecision({ event, action })}
          />
        </div>
      </section>

      <AdminEventDecisionDialog
        event={decision?.event}
        action={decision?.action}
        isSubmitting={isSubmitting}
        onClose={() => setDecision(null)}
        onConfirm={confirmDecision}
      />
    </main>
  );
}
