import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Info,
  Loader2,
  LogIn,
  UserPlus,
  Users,
} from "lucide-react";

export function RegisterActionBar({
  maxCapacity = null,
  count = 0,
  registered = false,
  registerLoading = false,
  dataLoading = false,
  onRegister,
  feedback = { type: null, message: "" },
  user = null,
  floating = false,
}) {
  const hasCapacityLimit = Number.isFinite(maxCapacity);
  const isFull = hasCapacityLimit && count >= maxCapacity;
  const capacityLabel = dataLoading
    ? "Đang tải thông tin đăng ký"
    : hasCapacityLimit
      ? `${count}/${maxCapacity} đã đăng ký`
      : `${count} tham gia`;
  const actionLabel = dataLoading
    ? capacityLabel
    : registered
      ? "Bạn đã đăng ký"
      : isFull
        ? "Tham gia danh sách chờ"
        : `Đăng ký ngay · ${capacityLabel}`;

  return (
    <section
      className={`group pointer-events-auto relative transition-all duration-300 ${
        floating
          ? ""
          : "rounded-full border border-violet-200 bg-white/95 p-2 shadow-[0_18px_48px_-24px_rgba(76,29,149,0.35)] backdrop-blur-xl"
      }`}
    >
      <div className="flex items-center gap-2">
        {!floating && (
          <span className="flex min-w-0 items-center gap-2 pl-2 text-sm font-semibold text-slate-800">
            {dataLoading ? (
              <Loader2 className="size-4 animate-spin text-violet-600" />
            ) : (
              <Users className="size-4 text-violet-700" />
            )}
            {capacityLabel}
          </span>
        )}

      <button
        type="button"
        onClick={onRegister}
        disabled={registered || registerLoading || dataLoading}
        aria-label={actionLabel}
        aria-describedby={floating ? "event-registration-tooltip" : undefined}
        className={`${
          floating
            ? "grid size-14 place-items-center rounded-full border shadow-[0_16px_40px_-14px_rgba(76,29,149,0.55)]"
            : "flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold shadow-sm"
        } transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 ${
          registered
            ? "cursor-not-allowed border-emerald-200 bg-emerald-100 text-emerald-800"
            : isFull
              ? "border-amber-600 bg-amber-600 text-white hover:-translate-y-1 hover:scale-105 hover:bg-amber-700 active:translate-y-0 active:scale-95"
              : registerLoading
                ? "cursor-wait border-violet-300 bg-violet-400 text-white"
                : "border-violet-600 bg-violet-700 text-white hover:-translate-y-1 hover:scale-105 hover:bg-violet-800 active:translate-y-0 active:scale-95"
        }`}
      >
        {registerLoading ? (
          floating ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <Loader2 className="size-4 animate-spin" />
              Đang xử lý...
            </>
          )
        ) : dataLoading ? (
          floating ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            "Đăng ký ngay"
          )
        ) : registered ? (
          floating ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Đã đăng ký
            </>
          )
        ) : isFull ? (
          floating ? (
            <UserPlus className="size-5" />
          ) : (
            <>
              <UserPlus className="size-4" />
              Đăng ký danh sách chờ
            </>
          )
        ) : floating ? (
          <UserPlus className="size-5" />
        ) : (
          <>
            Đăng ký ngay
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
      </div>

      {floating && (
        <span
          id="event-registration-tooltip"
          role="tooltip"
          className="pointer-events-none absolute right-full top-1/2 mr-3 w-max max-w-56 -translate-y-1/2 translate-x-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 opacity-0 shadow-lg transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"
        >
          {actionLabel}
        </span>
      )}

      {feedback.message && (
        <div
          className={`absolute bottom-full right-0 mb-3 flex w-[min(22rem,calc(100vw-2.5rem))] items-start gap-2.5 rounded-xl p-3 text-xs font-medium shadow-lg lg:bottom-auto lg:top-full lg:mb-0 lg:mt-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : feedback.type === "warning"
                ? "bg-amber-50 text-amber-800"
                : feedback.type === "info"
                  ? "bg-blue-50 text-blue-800"
                  : "bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.type === "success" && <CheckCircle2 className="size-4 shrink-0" />}
          {feedback.type === "warning" && <LogIn className="size-4 shrink-0" />}
          {feedback.type === "info" && <Info className="size-4 shrink-0" />}
          {feedback.type === "error" && <AlertCircle className="size-4 shrink-0" />}
          <div>
            <span>{feedback.message}</span>
            {!user && feedback.type === "warning" && (
              <span className="mt-1 block font-normal text-amber-700">
                Đăng nhập để tiếp tục đăng ký.
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default RegisterActionBar;
