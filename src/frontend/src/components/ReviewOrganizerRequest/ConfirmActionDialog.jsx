import { AlertTriangle, CircleCheckBig, X } from "lucide-react";

export default function ConfirmActionDialog({
  action,
  isSubmitting,
  onCancel,
  onConfirm,
}) {
  if (!action) return null;

  const isApproval = action.status === "approved";
  const DialogIcon = isApproval ? CircleCheckBig : AlertTriangle;

  return (
    <div
      className="review-backdrop fixed inset-0 z-50 grid place-items-center bg-[#111827]/50 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="review-dialog w-full max-w-[440px] rounded-2xl border border-white/60 bg-white p-6 shadow-[0_32px_90px_rgba(20,12,30,0.28)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-5">
          <span
            className={`grid size-12 place-items-center rounded-2xl ${
              isApproval
                ? "bg-[#eee7ff] text-[#6d20df]"
                : "bg-[#fff0f0] text-[#c42b2b]"
            }`}
          >
            <DialogIcon className="size-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Đóng"
            className="grid size-9 place-items-center rounded-full text-[#756c7e] transition-colors hover:bg-[#f4f0f7] hover:text-[#4c4355] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <h2
          id="confirm-title"
          className="mt-5 font-['Manrope'] text-2xl font-bold tracking-[-0.025em] text-[#172235]"
        >
          {isApproval ? "Chấp nhận yêu cầu này?" : "Từ chối yêu cầu này?"}
        </h2>
        <p id="confirm-description" className="mt-2 text-sm leading-6 text-[#665e70]">
          Hành động sẽ cập nhật quyền của{" "}
          <strong className="font-semibold text-[#302839]">{action.request.name}</strong>.
          Hãy xác nhận bạn đã kiểm tra đầy đủ hồ sơ minh chứng.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 rounded-xl border border-[#d8d0df] bg-white px-4 text-sm font-semibold text-[#51495a] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f8f6fa] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`h-11 rounded-xl px-4 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65 disabled:hover:translate-y-0 ${
              isApproval
                ? "bg-[#6d20df] shadow-[#6d20df]/20 hover:bg-[#5915bd]"
                : "bg-[#c92d2d] shadow-[#c92d2d]/20 hover:bg-[#ac2222]"
            }`}
          >
            {isSubmitting
              ? "Đang cập nhật..."
              : isApproval
                ? "Xác nhận duyệt"
                : "Xác nhận từ chối"}
          </button>
        </div>
      </section>
    </div>
  );
}
