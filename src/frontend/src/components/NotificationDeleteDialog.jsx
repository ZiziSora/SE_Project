import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CircleAlert, LoaderCircle, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";


gsap.registerPlugin(useGSAP);


export default function NotificationDeleteDialog({
  count,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  const backdropRef = useRef(null);
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const isClosingRef = useRef(false);
  const isConfirmingRef = useRef(false);
  const isMultiple = count > 1;

  useGSAP(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      gsap.set([backdropRef.current, dialogRef.current], {
        clearProps: "all",
      });
      return;
    }

    gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.22 },
      )
      .fromTo(
        dialogRef.current,
        { opacity: 0, y: 24, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.42 },
        "-=0.12",
      );
  }, []);

  const closeDialog = () => {
    if (isDeleting || isClosingRef.current) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      onCancel();
      return;
    }

    isClosingRef.current = true;
    gsap
      .timeline({ onComplete: onCancel })
      .to(dialogRef.current, {
        opacity: 0,
        y: 14,
        scale: 0.97,
        duration: 0.18,
        ease: "power2.in",
      })
      .to(
        backdropRef.current,
        { opacity: 0, duration: 0.16, ease: "power2.inOut" },
        "-=0.08",
      );
  };

  const handleConfirm = async () => {
    if (isConfirmingRef.current) return;
    isConfirmingRef.current = true;
    const wasDeleted = await onConfirm();
    if (wasDeleted) {
      closeDialog();
    } else {
      isConfirmingRef.current = false;
    }
  };

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      confirmButtonRef.current?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isDeleting) {
        closeDialog();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  return createPortal(
    <div
      ref={backdropRef}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          closeDialog();
        }
      }}
      className="fixed inset-0 z-100 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-[3px]"
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notification-delete-title"
        aria-describedby="notification-delete-description"
        className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]"
      >
        <div className="relative px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
          <button
            type="button"
            onClick={closeDialog}
            disabled={isDeleting}
            aria-label="Đóng hộp thoại xác nhận"
            className="absolute right-4 top-4 grid size-9 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:cursor-wait disabled:opacity-50"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>

          <div className="grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
            <Trash2 className="size-5" strokeWidth={2.2} aria-hidden="true" />
          </div>

          <h2
            id="notification-delete-title"
            className="mt-5 font-manrope text-xl font-bold tracking-[-0.02em] text-slate-950"
          >
            {isMultiple ? `Xóa ${count} thông báo?` : "Xóa thông báo này?"}
          </h2>
          <p
            id="notification-delete-description"
            className="mt-2 max-w-sm text-sm leading-6 text-slate-600"
          >
            {isMultiple
              ? "Các thông báo đã chọn sẽ bị xóa khỏi tài khoản của bạn và không thể khôi phục."
              : "Thông báo sẽ bị xóa khỏi tài khoản của bạn và không thể khôi phục."}
          </p>

          <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-100">
            <CircleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p className="text-xs font-medium leading-5">
              Thao tác này chỉ xóa thông báo, không ảnh hưởng đến sự kiện hoặc đăng ký liên quan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-7">
          <button
            type="button"
            onClick={closeDialog}
            disabled={isDeleting}
            className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-wait disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(220,38,38,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-70"
          >
            {isDeleting ? (
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            {isDeleting ? "Đang xóa..." : "Xóa"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
