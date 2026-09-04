import { useEffect } from "react";
import { Check, LoaderCircle, ShieldCheck, CircleAlert, X } from "lucide-react";

export default function AdminEventDecisionDialog({
  event,
  action,
  isSubmitting = false,
  onClose,
  onConfirm,
}) {
  const isRejecting = action === "reject";
  // Hồ sơ có thể là sự kiện mới, hoặc yêu cầu chỉnh sửa sự kiện đang công khai
  // — hệ quả của mỗi quyết định khác hẳn nhau nên câu chữ phải khác theo.
  const isRevision = event?.kind === "REVISION";

  useEffect(() => {
    if (!event) return undefined;

    const handleKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [event, isSubmitting, onClose]);

  if (!event || !action) return null;

  const canSubmit = !isSubmitting;

  return (
    <div
      className="review-backdrop fixed inset-0 z-50 grid place-items-center bg-[#111827]/55 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-review-dialog-title"
        className="review-dialog w-full max-w-[480px] rounded-2xl border border-white/70 bg-white p-6 shadow-[0_32px_90px_rgba(20,12,30,0.3)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-5">
          <span
            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
              isRejecting
                ? "bg-red-50 text-red-600"
                : "bg-[#eee7ff] text-[#6d20df]"
            }`}
          >
            {isRejecting ? (
              <CircleAlert className="size-5" strokeWidth={2} aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-5" strokeWidth={2} aria-hidden="true" />
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="grid size-9 place-items-center rounded-full text-[#807787] transition-colors hover:bg-[#f2eef5] hover:text-[#3d3545] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>

        <h2
          id="admin-review-dialog-title"
          className="mt-5 font-['Cabinet_Grotesk','Manrope',sans-serif] text-2xl font-bold tracking-[-0.035em] text-[#172235]"
        >
          {isRevision
            ? isRejecting
              ? "Từ chối thay đổi?"
              : "Áp dụng thay đổi?"
            : isRejecting
              ? "Từ chối sự kiện?"
              : "Phê duyệt sự kiện?"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6f6678]">
          {isRevision
            ? isRejecting
              ? "Sự kiện giữ nguyên nội dung đang công khai. Yêu cầu chỉnh sửa bị huỷ, Ban tổ chức có thể gửi lại yêu cầu khác."
              : "Nội dung mới sẽ được ghi đè lên sự kiện đang công khai và sinh viên thấy ngay sau đó."
            : isRejecting
              ? "Sự kiện sẽ được chuyển về bản nháp để Ban tổ chức chỉnh sửa và gửi duyệt lại."
              : "Sự kiện sẽ được phép chuyển sang trạng thái công khai cho sinh viên đăng ký."}
        </p>

        <div className="mt-5 rounded-xl border border-[#e6e0eb] bg-[#faf9fc] p-4">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#2a2431]">
            {event.title}
          </p>
          <p className="mt-1 text-xs text-[#857c8d]">
            {event.eventId ?? event.id}
            {isRevision && ` · ${event.changes.length} thay đổi`}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 rounded-xl border border-[#d8d0df] bg-white px-5 text-sm font-semibold text-[#51495b] transition-colors hover:bg-[#f8f5fa] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSubmit}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
              isRejecting
                ? "bg-[#c33c35] hover:bg-[#a92f2a]"
                : "bg-[#6d20df] hover:bg-[#5b16c2]"
            }`}
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : isRejecting ? (
              <X className="size-4" strokeWidth={2.2} aria-hidden="true" />
            ) : (
              <Check className="size-4" strokeWidth={2.2} aria-hidden="true" />
            )}
            {isRejecting
              ? "Xác nhận từ chối"
              : isRevision
                ? "Áp dụng thay đổi"
                : "Phê duyệt sự kiện"}
          </button>
        </div>
      </section>
    </div>
  );
}
