import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Download,
  FileText,
  MapPin,
  ShieldCheck,
  Tag,
  UsersRound,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import AdminEventDecisionDialog from "../../components/AdminEventReview/AdminEventDecisionDialog.jsx";
import AdminReviewStatusBadge from "../../components/AdminEventReview/AdminReviewStatusBadge.jsx";
import EventReviewInfoItem from "../../components/AdminEventReview/EventReviewInfoItem.jsx";
import EventReviewPoster from "../../components/AdminEventReview/EventReviewPoster.jsx";
import ReviewPolicyMarquee from "../../components/AdminEventReview/ReviewPolicyMarquee.jsx";
import ReviewQueueNavigator from "../../components/AdminEventReview/ReviewQueueNavigator.jsx";
import AdminHeader from "../../components/ReviewOrganizerRequest/AdminHeader.jsx";
import {
  getAdminReviewEvents,
  saveAdminReviewDecision,
} from "../../lib/adminEventReviewStore.js";
import {
  formatAdminReviewDate,
  formatAdminReviewTime,
} from "../../utils/adminEventReviewUtils.js";

export default function AdminEventReviewDetailPage() {
  const { eventId } = useParams();
  const [events, setEvents] = useState(getAdminReviewEvents);
  const [decisionAction, setDecisionAction] = useState(null);
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

  const event = useMemo(
    () => events.find((eventItem) => eventItem.id === eventId) ?? null,
    [eventId, events],
  );
  const pendingEvents = useMemo(
    () => events.filter((eventItem) => eventItem.status === "PENDING"),
    [events],
  );
  const queueIndex = pendingEvents.findIndex((eventItem) => eventItem.id === eventId);
  const previousEvent = queueIndex > 0 ? pendingEvents[queueIndex - 1] : null;
  const nextEvent = queueIndex >= 0 ? pendingEvents[queueIndex + 1] ?? null : pendingEvents[0] ?? null;

  const confirmDecision = (reason) => {
    if (!event || !decisionAction || isSubmitting) return;

    setIsSubmitting(true);
    window.setTimeout(() => {
      const status = decisionAction === "approve" ? "APPROVED" : "REJECTED";
      saveAdminReviewDecision(event.id, status, reason);
      toast.success(
        status === "APPROVED"
          ? "Sự kiện đã được phê duyệt và sẵn sàng xuất bản."
          : "Đã gửi phản hồi từ chối đến Ban tổ chức.",
      );
      setDecisionAction(null);
      setIsSubmitting(false);
    }, 350);
  };

  if (!event) {
    return (
      <main className="min-h-screen bg-[#f8f9ff] font-['Inter',sans-serif] text-[#172235]">
        <AdminHeader />
        <section className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-5 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eee7ff] text-[#6d20df]">
              <CalendarDays className="size-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 font-['Cabinet_Grotesk','Manrope',sans-serif] text-3xl font-bold tracking-[-0.045em]">
              Không tìm thấy hồ sơ sự kiện
            </h1>
            <p className="mt-2 text-sm text-[#776e80]">
              Hồ sơ có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.
            </p>
            <Link
              to="/admin/events"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#6d20df] px-5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Về danh sách
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8f9ff] font-['Inter',sans-serif] text-[#172235]">
      <AdminHeader />

      <section className="relative mx-auto w-full max-w-[1440px] px-5 pb-8 pt-8 sm:px-8 lg:px-16 lg:pt-10">
        <div className="pointer-events-none absolute -right-24 top-0 size-[400px] rounded-full bg-[#d9c5ff]/25 blur-[110px]" aria-hidden="true" />

        <Link
          to="/admin/events"
          className="review-reveal relative z-10 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#6d20df] transition-colors hover:text-[#5315b4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7c3aed]"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden="true" />
          Quay lại hàng chờ
        </Link>

        <section className="review-reveal relative z-10 mt-8 grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_auto]" style={{ animationDelay: "70ms" }}>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-semibold tracking-[0.06em] text-[#7f7588]">
                {event.id}
              </span>
              <AdminReviewStatusBadge status={event.status} />
            </div>
            <h1 className="mt-5 max-w-5xl font-['Cabinet_Grotesk','Manrope',sans-serif] text-[clamp(2.35rem,4.8vw,4.4rem)] font-bold leading-[1.03] tracking-[-0.058em] text-[#142033]">
              {event.title}
            </h1>
            <p className="mt-4 flex items-center gap-2 text-sm text-[#6d6476]">
              <span className="grid size-7 place-items-center rounded-full bg-[#e8eef9] text-[9px] font-bold text-[#5f6f88]">
                {event.organizerInitials}
              </span>
              Gửi bởi <strong className="font-semibold text-[#3e3547]">{event.organizerName}</strong>
              <span aria-hidden="true">·</span>
              {formatAdminReviewDate(event.submittedAt)} lúc {formatAdminReviewTime(event.submittedAt)}
            </p>
          </div>

          {event.status === "PENDING" && (
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => setDecisionAction("reject")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                <X className="size-4" strokeWidth={2.2} aria-hidden="true" />
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => setDecisionAction("approve")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#6d20df] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,32,223,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#5b16c2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
              >
                <Check className="size-4" strokeWidth={2.2} aria-hidden="true" />
                Phê duyệt sự kiện
              </button>
            </div>
          )}
        </section>
      </section>

      <section className="mx-auto grid w-full max-w-[1440px] gap-7 px-5 pb-28 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(330px,.65fr)] lg:px-16">
        <div className="min-w-0 space-y-6">
          {event.status !== "PENDING" && (
            <section className={`review-reveal rounded-2xl border p-5 sm:p-6 ${event.status === "APPROVED" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex gap-3.5">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${event.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {event.status === "APPROVED" ? <Check className="size-5" aria-hidden="true" /> : <X className="size-5" aria-hidden="true" />}
                </span>
                <div>
                  <h2 className="font-['Cabinet_Grotesk','Manrope',sans-serif] text-lg font-bold text-[#243247]">
                    {event.status === "APPROVED" ? "Hồ sơ đã được phê duyệt" : "Hồ sơ đã bị từ chối"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#675e70]">
                    {event.status === "APPROVED"
                      ? "Sự kiện đã đủ điều kiện chuyển sang trạng thái công khai cho sinh viên."
                      : event.rejectionReason || "Ban tổ chức cần cập nhật hồ sơ trước khi gửi duyệt lại."}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="review-reveal overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_20px_58px_rgba(44,29,59,0.07)]" style={{ animationDelay: "120ms" }}>
            <div className="border-b border-[#e7e1ec] px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4.5 text-[#6d20df]" strokeWidth={2} aria-hidden="true" />
                <h2 className="font-['Cabinet_Grotesk','Manrope',sans-serif] text-xl font-bold tracking-[-0.03em] text-[#172235]">
                  Nội dung đăng ký
                </h2>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-[15px] leading-7 text-[#5e5667]">{event.description}</p>
            </div>

            <div className="grid grid-flow-dense border-t border-[#e7e1ec] md:grid-cols-2">
              <EventReviewInfoItem icon={CalendarDays} label="Bắt đầu">
                <p>{formatAdminReviewDate(event.startTime)}</p>
                <p className="mt-0.5 font-normal text-[#71687a]">{formatAdminReviewTime(event.startTime)}</p>
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={Clock3} label="Kết thúc">
                <p>{formatAdminReviewDate(event.endTime)}</p>
                <p className="mt-0.5 font-normal text-[#71687a]">{formatAdminReviewTime(event.endTime)}</p>
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={CalendarDays} label="Hạn đăng ký">
                <p>{formatAdminReviewDate(event.registrationDeadline)}</p>
                <p className="mt-0.5 font-normal text-[#71687a]">{formatAdminReviewTime(event.registrationDeadline)}</p>
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={UsersRound} label="Sức chứa">
                <p>{event.capacity.toLocaleString("vi-VN")} sinh viên</p>
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={MapPin} label="Địa điểm">
                <p>{event.location}</p>
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={Tag} label="Danh mục">
                <p>{event.category}</p>
              </EventReviewInfoItem>
            </div>
          </section>

          <section className="review-reveal overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_14px_42px_rgba(44,29,59,0.055)]" style={{ animationDelay: "190ms" }}>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[#eef3fb] text-[#536b91]">
                  <FileText className="size-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-[#2d3747]">{event.fileName}</h2>
                  <p className="mt-1 text-xs text-[#857c8d]">Tài liệu kế hoạch · {event.fileSize}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toast.info("Bản demo chưa gắn tệp kế hoạch từ backend.")}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d8d0df] bg-white px-4 text-xs font-semibold text-[#51495b] transition-all hover:border-[#bda8d6] hover:bg-[#f7f3fb] hover:text-[#6d20df]"
              >
                <Download className="size-4" strokeWidth={1.9} aria-hidden="true" />
                Xem tài liệu
              </button>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-[96px] lg:self-start">
          <section className="review-reveal overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_22px_65px_rgba(44,29,59,0.09)]" style={{ animationDelay: "140ms" }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="font-['Cabinet_Grotesk','Manrope',sans-serif] text-base font-bold tracking-[-0.025em] text-[#172235]">Poster sự kiện</h2>
                <p className="mt-0.5 text-[11px] text-[#918897]">Bản xem trước khi xuất bản</p>
              </div>
              <span className="rounded-full bg-[#f0eaff] px-2.5 py-1 text-[10px] font-semibold text-[#6d20df]">4:5</span>
            </div>
            <EventReviewPoster event={event} />
          </section>

          <ReviewQueueNavigator previousEvent={previousEvent} nextEvent={nextEvent} />
        </aside>
      </section>

      {event.status === "PENDING" && (
        <div className="fixed inset-x-0 bottom-4 z-20 mx-auto hidden w-fit items-center gap-3 rounded-2xl border border-white/70 bg-[#172235]/95 p-2.5 pl-5 text-white shadow-[0_18px_55px_rgba(21,28,45,0.28)] backdrop-blur-xl md:flex">
          <p className="mr-2 text-xs font-medium text-white/70">Đã kiểm tra đầy đủ hồ sơ?</p>
          <button type="button" onClick={() => setDecisionAction("reject")} className="h-10 rounded-xl border border-white/20 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10">Từ chối</button>
          <button type="button" onClick={() => setDecisionAction("approve")} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-[#5f18c7] transition-transform hover:-translate-y-0.5"><Check className="size-3.5" aria-hidden="true" /> Phê duyệt</button>
        </div>
      )}

      <AdminEventDecisionDialog
        event={event}
        action={decisionAction}
        isSubmitting={isSubmitting}
        onClose={() => setDecisionAction(null)}
        onConfirm={confirmDecision}
      />
    </main>
  );
}
