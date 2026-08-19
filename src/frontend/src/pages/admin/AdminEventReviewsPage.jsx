import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CircleX,
  ClipboardList,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import AdminEventDecisionDialog from "../../components/AdminEventReview/AdminEventDecisionDialog.jsx";
import AdminReviewStatCard from "../../components/AdminEventReview/AdminReviewStatCard.jsx";
import EventReviewQueue from "../../components/AdminEventReview/EventReviewQueue.jsx";
import AdminHeader from "../../components/ReviewOrganizerRequest/AdminHeader.jsx";
import {
  decideReviewItem,
  getReviewQueue,
} from "../../api/adminEventReviewApi.js";

const PAGE_SIZE = 4;

export default function AdminEventReviewsPage() {
  const [events, setEvents] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  // Tách riêng để thẻ thống kê nói rõ trong hàng chờ có bao nhiêu sự kiện mới
  // và bao nhiêu yêu cầu chỉnh sửa.
  const [pendingChanges, setPendingChanges] = useState(0);
  const [processed, setProcessed] = useState({ approved: 0, rejected: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [decision, setDecision] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const result = await getReviewQueue();
      setEvents(result.items);
      setTotalPending(result.total);
      setPendingChanges(result.changeTotal);
    } catch (error) {
      setLoadError(
        error.response?.data?.detail ||
          "Không thể tải hàng chờ xét duyệt. Vui lòng thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Tải hàng chờ khi trang được mở.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, [loadEvents]);

  const summary = useMemo(
    () => ({
      pending: totalPending,
      changes: pendingChanges,
      processed: processed.approved + processed.rejected,
      approved: processed.approved,
      rejected: processed.rejected,
    }),
    [pendingChanges, processed, totalPending],
  );
  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("vi");

    return events.filter((event) => {
      const searchableText = [
        event.title,
        event.eventId,
        event.organizerName,
        event.organization,
        event.category,
        event.location,
      ]
        .join(" ")
        .toLocaleLowerCase("vi");

      return !normalizedSearch || searchableText.includes(normalizedSearch);
    });
  }, [events, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const visibleEvents = filteredEvents.slice(
    pageStartIndex,
    pageStartIndex + PAGE_SIZE,
  );
  const updateSearchTerm = (value) => {
    setCurrentPage(1);
    setSearchTerm(value);
  };

  const confirmDecision = async () => {
    if (!decision || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isApproving = decision.action === "approve";
      // Sự kiện mới và yêu cầu chỉnh sửa đi qua hai API khác nhau
      const result = await decideReviewItem(decision.event, decision.action);

      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== decision.event.id),
      );
      setTotalPending((total) => Math.max(total - 1, 0));
      if (decision.event.kind === "REVISION") {
        setPendingChanges((total) => Math.max(total - 1, 0));
      }
      setProcessed((current) => ({
        ...current,
        [isApproving ? "approved" : "rejected"]:
          current[isApproving ? "approved" : "rejected"] + 1,
      }));
      toast.success(result.message);
      setDecision(null);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Không thể cập nhật kết quả xét duyệt.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8f9ff] font-['Inter',sans-serif] text-[#172235]">
      <AdminHeader />

      <section className="relative mx-auto w-full max-w-[1440px] px-5 pb-10 pt-10 sm:px-8 sm:pt-14 lg:px-16">
        <div
          className="pointer-events-none absolute -right-24 top-0 size-[430px] rounded-full bg-[#d9c5ff]/30 blur-[115px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-52 top-[360px] size-[360px] rounded-full bg-[#c9e9f4]/20 blur-[105px]"
          aria-hidden="true"
        />

        <section className="review-reveal relative z-10 grid items-end gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(330px,.6fr)]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#6d20df]">
              <ShieldCheck
                className="size-4"
                strokeWidth={2}
                aria-hidden="true"
              />
              Trung tâm kiểm duyệt
            </div>
            <h1 className="mt-5 max-w-5xl font-['Cabinet_Grotesk','Manrope',sans-serif] text-[clamp(2.55rem,5.2vw,4.8rem)] font-bold leading-[1.02] tracking-[-0.06em] text-[#142033]">
              Kiểm duyệt sự kiện trước khi xuất bản
            </h1>
            <p className="mt-5 max-w-2xl text-[clamp(.95rem,1.4vw,1.08rem)] leading-7 text-[#6c6375]">
              Kiểm tra nội dung, lịch trình và hồ sơ kế hoạch để mỗi sự kiện đến
              với sinh viên đều rõ ràng, an toàn và đáng tin cậy.
            </p>
          </div>
          <aside className="border-l-2 border-[#7c3aed] pl-5 lg:mb-1 lg:justify-self-end lg:max-w-[340px]">
            <p className="text-sm leading-6 text-[#6b6275]">
              Hàng chờ được đồng bộ trực tiếp từ hệ thống. Sự kiện đang công
              khai vẫn giữ nguyên nội dung cũ cho tới khi bạn duyệt phần thay
              đổi.
            </p>
          </aside>
        </section>

        <section
          className="review-reveal relative z-10 mt-10 grid grid-flow-dense grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#ded7e7] bg-[#e8e2ee] shadow-[0_18px_50px_rgba(44,29,59,0.07)] md:grid-cols-4"
          style={{ animationDelay: "110ms" }}
          aria-label="Tổng quan kiểm duyệt"
        >
          <AdminReviewStatCard
            label="Hàng chờ hiện tại"
            value={summary.pending}
            helper={`${summary.pending - summary.changes} sự kiện mới · ${summary.changes} yêu cầu sửa`}
            icon={ClipboardList}
            tone="blue"
          />
          <AdminReviewStatCard
            label="Đã xử lý"
            value={summary.processed}
            helper="Trong phiên làm việc hiện tại"
            icon={CalendarClock}
          />
          <AdminReviewStatCard
            label="Đã duyệt"
            value={summary.approved}
            helper="Trong phiên làm việc hiện tại"
            icon={CalendarCheck2}
            tone="green"
          />
          <AdminReviewStatCard
            label="Đã từ chối"
            value={summary.rejected}
            helper="Trong phiên làm việc hiện tại"
            icon={CircleX}
            tone="red"
          />
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
              <p className="mt-1 text-sm text-[#7a7183]">
                Gồm sự kiện mới gửi duyệt và yêu cầu chỉnh sửa sự kiện đang
                công khai.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <label className="relative block w-full sm:w-[320px]">
                <span className="sr-only">Tìm kiếm sự kiện</span>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#83798d]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(changeEvent) =>
                    updateSearchTerm(changeEvent.target.value)
                  }
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
            </div>
          </div>

          {isLoading ? (
            <div className="grid min-h-[330px] place-items-center text-sm font-semibold text-[#766e80]">
              <div className="text-center">
                <LoaderCircle className="mx-auto mb-3 size-7 animate-spin text-[#6d20df]" />
                Đang tải hàng chờ xét duyệt...
              </div>
            </div>
          ) : loadError ? (
            <div className="grid min-h-[330px] place-items-center px-6 text-center">
              <div>
                <p className="text-sm font-semibold text-red-600">{loadError}</p>
                <button
                  type="button"
                  onClick={loadEvents}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#d8d0df] bg-white px-4 text-xs font-semibold text-[#51495b] hover:bg-[#f7f4fa]"
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Thử lại
                </button>
              </div>
            </div>
          ) : (
            <EventReviewQueue
              events={visibleEvents}
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              displayStart={filteredEvents.length ? pageStartIndex + 1 : 0}
              displayEnd={
                filteredEvents.length
                  ? pageStartIndex + visibleEvents.length
                  : 0
              }
              totalResults={filteredEvents.length}
              onPageChange={setCurrentPage}
              onDecision={(event, action) => setDecision({ event, action })}
            />
          )}
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
