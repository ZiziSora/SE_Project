import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, ShieldCheck, X } from "lucide-react";

import { cn } from "../lib/utils";

/**
 * Hộp thoại xác nhận dùng chung, thay cho `window.confirm` của trình duyệt.
 *
 * Vì sao không dùng window.confirm: nó hiện hộp thoại đen của trình duyệt kèm
 * dòng "localhost:5173 says", lạc hẳn khỏi giao diện và không nói được gì thêm
 * về hậu quả của thao tác. Hộp thoại này giữ đúng phong cách của màn hình xét
 * duyệt bên Quản trị viên: biểu tượng, tiêu đề, câu giải thích hậu quả, rồi
 * khung xám nhắc lại chính xác đối tượng đang bị tác động.
 *
 * @param {object} props
 * @param {boolean}  props.open
 * @param {'primary'|'danger'} [props.tone]  danger = hành động không hoàn tác được
 * @param {React.ElementType} [props.icon]
 * @param {string}   props.title
 * @param {string}   props.description       Nói rõ điều gì sẽ xảy ra sau khi bấm
 * @param {string}   [props.detailTitle]     Tên đối tượng (tên sự kiện...)
 * @param {string}   [props.detailSubtitle]  Dòng phụ mờ (mã sự kiện...)
 * @param {string}   props.confirmLabel
 * @param {boolean}  [props.isSubmitting]
 *
 * Ô nhập lý do (tuỳ chọn): chỉ hiện khi truyền `onReasonChange`. Dùng cho những
 * thao tác mà người bị ảnh hưởng cần biết VÌ SAO — ví dụ huỷ sự kiện đang mở
 * đăng ký thì lý do được gửi kèm trong thông báo tới sinh viên.
 * @param {string}   [props.reasonLabel]
 * @param {string}   [props.reasonPlaceholder]
 * @param {string}   [props.reasonValue]
 * @param {(value: string) => void} [props.onReasonChange]
 * @param {boolean}  [props.reasonRequired]  Bỏ trống thì nút xác nhận bị khoá
 */
export default function ConfirmDialog({
  open,
  tone = "primary",
  icon: Icon = ShieldCheck,
  title,
  description,
  detailTitle,
  detailSubtitle,
  confirmLabel,
  cancelLabel = "Quay lại",
  isSubmitting = false,
  reasonLabel,
  reasonPlaceholder,
  reasonValue = "",
  onReasonChange,
  reasonRequired = false,
  onClose,
  onConfirm,
}) {
  const isDanger = tone === "danger";
  const showReason = typeof onReasonChange === "function";
  const missingReason = showReason && reasonRequired && !reasonValue.trim();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isSubmitting, onClose]);

  if (!open) return null;

  // Dựng thẳng vào <body>: hộp thoại thường được đặt bên trong thẻ bảng có
  // `overflow-hidden`, mà chỉ cần một tổ tiên có transform/filter là phần tử
  // `fixed` sẽ bị neo và cắt theo tổ tiên đó thay vì phủ kín màn hình.
  return createPortal(
    <div
      className="review-backdrop fixed inset-0 z-50 grid place-items-center bg-[#111827]/55 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(mouseEvent) => {
        // Chỉ đóng khi bấm đúng vào nền, không phải khi kéo chuột từ trong ra
        if (mouseEvent.target === mouseEvent.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="review-dialog w-full max-w-[460px] rounded-2xl border border-border bg-card p-6 shadow-[0_32px_90px_rgba(20,12,30,0.3)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-5">
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-2xl",
              isDanger
                ? "bg-red-50 text-destructive"
                : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <h2
          id="confirm-dialog-title"
          className="mt-5 text-2xl font-bold tracking-tight text-foreground"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        {detailTitle && (
          <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
              {detailTitle}
            </p>
            {detailSubtitle && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {detailSubtitle}
              </p>
            )}
          </div>
        )}

        {showReason && (
          <div className="mt-5">
            <label
              htmlFor="confirm-dialog-reason"
              className="block text-sm font-semibold text-foreground"
            >
              {reasonLabel ?? "Lý do"}
              {reasonRequired && <span className="text-destructive"> *</span>}
            </label>
            <textarea
              id="confirm-dialog-reason"
              rows={3}
              maxLength={500}
              value={reasonValue}
              disabled={isSubmitting}
              placeholder={reasonPlaceholder}
              onChange={(changeEvent) => onReasonChange(changeEvent.target.value)}
              className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="mt-1.5 text-right font-mono text-xs text-muted-foreground">
              {reasonValue.length}/500
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 cursor-pointer rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || missingReason}
            className={cn(
              "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-45",
              isDanger
                ? "bg-destructive hover:brightness-90"
                : "bg-primary hover:bg-primary/90",
            )}
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Icon className="size-4" strokeWidth={2.2} aria-hidden="true" />
            )}
            {isSubmitting ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
