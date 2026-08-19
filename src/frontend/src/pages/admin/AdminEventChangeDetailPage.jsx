import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  FileText,
  LoaderCircle,
  MapPin,
  PencilLine,
  RefreshCw,
  Tag,
  UsersRound,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import AdminEventDecisionDialog from "../../components/AdminEventReview/AdminEventDecisionDialog.jsx";
import EventReviewInfoItem from "../../components/AdminEventReview/EventReviewInfoItem.jsx";
import EventReviewPoster from "../../components/AdminEventReview/EventReviewPoster.jsx";
import EventRevisionDiff, {
  RevisionValueDiff,
} from "../../components/EventRevisionDiff.jsx";
import AdminHeader from "../../components/ReviewOrganizerRequest/AdminHeader.jsx";
import {
  decideReviewItem,
  getPendingEventChanges,
} from "../../api/adminEventReviewApi.js";
import {
  formatAdminReviewDate,
  formatAdminReviewTime,
} from "../../utils/adminEventReviewUtils.js";

/**
 * Trang Admin đối chiếu một YÊU CẦU CHỈNH SỬA trước khi áp dụng.
 *
 * Khác trang duyệt sự kiện mới ở chỗ trọng tâm không phải toàn bộ nội dung, mà
 * là PHẦN ĐÃ ĐỔI — nên bảng so sánh cũ → mới nằm ngay trên cùng, phần nội dung
 * đầy đủ chỉ để tham khảo bên dưới.
 */
export default function AdminEventChangeDetailPage() {
  const { revisionId } = useParams();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(null);
  const [decisionAction, setDecisionAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Tra nhanh "trường này có bị đổi không" để nhúng so sánh cũ → mới vào đúng ô
  // thông tin tương ứng, thay vì bắt Admin đối chiếu hai khối tách rời.
  const changeOf = useMemo(
    () =>
      Object.fromEntries(
        (revision?.changes ?? []).map((change) => [change.field, change]),
      ),
    [revision],
  );

  const loadRevision = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      // Backend chưa có endpoint lấy lẻ một bản sửa — hàng chờ vốn ngắn nên lấy
      // cả danh sách rồi lọc là đủ, đúng cách trang duyệt sự kiện mới đang làm.
      const result = await getPendingEventChanges();
      setRevision(result.items.find((item) => item.id === revisionId) ?? null);
    } catch (error) {
      setLoadError(
        error.response?.data?.detail ||
          "Không thể tải yêu cầu chỉnh sửa. Vui lòng thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [revisionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRevision();
  }, [loadRevision]);

  const confirmDecision = async () => {
    if (!revision || !decisionAction || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await decideReviewItem(revision, decisionAction);
      toast.success(result.message);
      setDecisionAction(null);
      // Xử lý xong thì hồ sơ rời hàng chờ, ở lại trang này không còn ý nghĩa
      navigate("/admin/manage-events");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Không thể cập nhật kết quả xét duyệt.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f8f9ff] font-['Inter',sans-serif] text-[#172235]">
        <AdminHeader />
        <section className="grid min-h-[70vh] place-items-center text-center text-sm font-semibold text-[#766e80]">
          <div>
            <LoaderCircle className="mx-auto mb-3 size-8 animate-spin text-[#6d20df]" />
            Đang tải yêu cầu chỉnh sửa...
          </div>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#f8f9ff] font-['Inter',sans-serif] text-[#172235]">
        <AdminHeader />
        <section className="grid min-h-[70vh] place-items-center px-5 text-center">
          <div>
            <p className="text-sm font-semibold text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={loadRevision}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#d8d0df] bg-white px-4 text-xs font-semibold text-[#51495b]"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Thử lại
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!revision) {
    return (
      <main className="min-h-screen bg-[#f8f9ff] font-['Inter',sans-serif] text-[#172235]">
        <AdminHeader />
        <section className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-5 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eee7ff] text-[#6d20df]">
              <PencilLine className="size-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 font-['Cabinet_Grotesk','Manrope',sans-serif] text-3xl font-bold tracking-[-0.045em]">
              Không tìm thấy yêu cầu chỉnh sửa
            </h1>
            <p className="mt-2 text-sm text-[#776e80]">
              Yêu cầu có thể đã được xử lý, đã bị Ban tổ chức rút lại, hoặc bị
              thay thế bởi một yêu cầu mới hơn.
            </p>
            <Link
              to="/admin/manage-events"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#6d20df] px-5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Về hàng chờ
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
        <div
          className="pointer-events-none absolute -right-24 top-0 size-[400px] rounded-full bg-[#d9c5ff]/25 blur-[110px]"
          aria-hidden="true"
        />

        <Link
          to="/admin/manage-events"
          className="review-reveal relative z-10 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#6d20df] transition-colors hover:text-[#5315b4]"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden="true" />
          Quay lại hàng chờ
        </Link>

        <section
          className="review-reveal relative z-10 mt-8 grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_auto]"
          style={{ animationDelay: "70ms" }}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-semibold tracking-[0.06em] text-[#7f7588]">
                {revision.eventId}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                <PencilLine className="size-3" aria-hidden="true" />
                Yêu cầu chỉnh sửa · {revision.changes.length} thay đổi
              </span>
            </div>
            <h1 className="mt-5 max-w-5xl font-['Cabinet_Grotesk','Manrope',sans-serif] text-[clamp(2.35rem,4.8vw,4.4rem)] font-bold leading-[1.03] tracking-[-0.058em] text-[#142033]">
              {revision.title}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#6d6476]">
              <span className="grid size-7 place-items-center rounded-full bg-[#e8eef9] text-[9px] font-bold text-[#5f6f88]">
                {revision.organizerInitials}
              </span>
              Gửi bởi{" "}
              <strong className="font-semibold text-[#3e3547]">
                {revision.organizerName}
              </strong>
              {revision.submittedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  {formatAdminReviewDate(revision.submittedAt)} lúc{" "}
                  {formatAdminReviewTime(revision.submittedAt)}
                </>
              )}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => setDecisionAction("reject")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-50"
            >
              <X className="size-4" strokeWidth={2.2} aria-hidden="true" />
              Từ chối thay đổi
            </button>
            <button
              type="button"
              onClick={() => setDecisionAction("approve")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#6d20df] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,32,223,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#5b16c2]"
            >
              <Check className="size-4" strokeWidth={2.2} aria-hidden="true" />
              Áp dụng thay đổi
            </button>
          </div>
        </section>
      </section>

      <section className="mx-auto grid w-full max-w-[1440px] gap-7 px-5 pb-28 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(330px,.65fr)] lg:px-16">
        <div className="min-w-0 space-y-6">
          {/* Trọng tâm của trang: đúng những gì Ban tổ chức muốn đổi */}
          <section className="review-reveal overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_20px_58px_rgba(44,29,59,0.07)]">
            <div className="border-b border-[#e7e1ec] px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2.5">
                <PencilLine
                  className="size-4.5 text-[#6d20df]"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <h2 className="font-['Cabinet_Grotesk','Manrope',sans-serif] text-xl font-bold tracking-[-0.03em] text-[#172235]">
                  Nội dung đề nghị thay đổi
                </h2>
              </div>
              <p className="mt-1.5 text-sm text-[#7a7183]">
                Sự kiện vẫn đang công khai với nội dung bị gạch bỏ. Chỉ khi bạn
                duyệt thì phần tô xanh mới được áp dụng.
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <EventRevisionDiff changes={revision.changes} />
            </div>
          </section>

          {/* Nội dung đầy đủ sau khi áp dụng — để đối chiếu bối cảnh */}
          <section
            className="review-reveal overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_14px_42px_rgba(44,29,59,0.055)]"
            style={{ animationDelay: "120ms" }}
          >
            <div className="border-b border-[#e7e1ec] px-5 py-5 sm:px-6">
              <h2 className="font-['Cabinet_Grotesk','Manrope',sans-serif] text-lg font-bold tracking-[-0.03em] text-[#172235]">
                Toàn bộ nội dung sự kiện
              </h2>
              <p className="mt-1.5 text-sm text-[#7a7183]">
                Ô nào có gạch bỏ là phần Ban tổ chức muốn đổi; ô không đánh dấu
                thì giữ nguyên như đang chạy.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              {changeOf.description ? (
                <div className="text-[15px] leading-7">
                  <RevisionValueDiff change={changeOf.description} />
                </div>
              ) : (
                <p className="text-[15px] leading-7 text-[#5e5667]">
                  {revision.description}
                </p>
              )}
            </div>

            <div className="grid grid-flow-dense border-t border-[#e7e1ec] md:grid-cols-2">
              <EventReviewInfoItem icon={CalendarDays} label="Bắt đầu">
                {changeOf.start_time ? (
                  <RevisionValueDiff change={changeOf.start_time} />
                ) : (
                  <>
                    <p>{formatAdminReviewDate(revision.startTime)}</p>
                    <p className="mt-0.5 font-normal text-[#71687a]">
                      {formatAdminReviewTime(revision.startTime)}
                    </p>
                  </>
                )}
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={Clock3} label="Kết thúc">
                {changeOf.end_time ? (
                  <RevisionValueDiff change={changeOf.end_time} />
                ) : (
                  <>
                    <p>{formatAdminReviewDate(revision.endTime)}</p>
                    <p className="mt-0.5 font-normal text-[#71687a]">
                      {formatAdminReviewTime(revision.endTime)}
                    </p>
                  </>
                )}
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={CalendarDays} label="Hạn đăng ký">
                {changeOf.registration_deadline ? (
                  <RevisionValueDiff change={changeOf.registration_deadline} />
                ) : (
                  <>
                    <p>{formatAdminReviewDate(revision.registrationDeadline)}</p>
                    <p className="mt-0.5 font-normal text-[#71687a]">
                      {formatAdminReviewTime(revision.registrationDeadline)}
                    </p>
                  </>
                )}
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={UsersRound} label="Sức chứa">
                {changeOf.capacity ? (
                  <RevisionValueDiff change={changeOf.capacity} />
                ) : (
                  <p>
                    {revision.capacity
                      ? `${revision.capacity.toLocaleString("vi-VN")} sinh viên`
                      : "Không giới hạn"}
                  </p>
                )}
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={MapPin} label="Địa điểm">
                {changeOf.location ? (
                  <RevisionValueDiff change={changeOf.location} />
                ) : (
                  <p>{revision.location}</p>
                )}
              </EventReviewInfoItem>
              <EventReviewInfoItem icon={Tag} label="Danh mục">
                {changeOf.category_id ? (
                  <RevisionValueDiff change={changeOf.category_id} />
                ) : (
                  <p>{revision.category}</p>
                )}
              </EventReviewInfoItem>
            </div>
          </section>

          <section
            className="review-reveal overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_14px_42px_rgba(44,29,59,0.055)]"
            style={{ animationDelay: "190ms" }}
          >
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[#eef3fb] text-[#536b91]">
                  <FileText
                    className="size-5"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#2d3747]">
                    Kế hoạch sự kiện
                  </h2>
                  {changeOf.file_url ? (
                    <div className="mt-1 text-xs">
                      <RevisionValueDiff change={changeOf.file_url} />
                    </div>
                  ) : (
                    <p className="mt-1 truncate text-xs text-[#857c8d]">
                      {revision.fileName || "Ban tổ chức chưa tải lên tài liệu"}
                    </p>
                  )}
                </div>
              </div>

              {revision.fileUrl ? (
                <a
                  href={revision.fileUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6d20df] px-4 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#5b16c2]"
                >
                  <ExternalLink
                    className="size-4"
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                  Xem kế hoạch
                </a>
              ) : (
                <span className="inline-flex h-10 shrink-0 items-center rounded-xl bg-[#f1eef4] px-4 text-xs font-semibold text-[#817889]">
                  Chưa có tài liệu
                </span>
              )}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-[96px] lg:self-start">
          <section className="review-reveal overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_22px_65px_rgba(44,29,59,0.09)]">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="font-['Cabinet_Grotesk','Manrope',sans-serif] text-base font-bold tracking-[-0.025em] text-[#172235]">
                  Poster sự kiện
                </h2>
                <p className="mt-0.5 text-[11px] text-[#918897]">
                  Ảnh bìa theo bản đề nghị
                </p>
              </div>
              <span className="rounded-full bg-[#f0eaff] px-2.5 py-1 text-[10px] font-semibold text-[#6d20df]">
                4:5
              </span>
            </div>
            <EventReviewPoster event={revision} />
          </section>
        </aside>
      </section>

      <AdminEventDecisionDialog
        event={revision}
        action={decisionAction}
        isSubmitting={isSubmitting}
        onClose={() => setDecisionAction(null)}
        onConfirm={confirmDecision}
      />
    </main>
  );
}
