import {
  Users,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  LogIn,
} from "lucide-react";

/* =========================================================
   Register Action Bar Component
   ========================================================= */
export function RegisterActionBar({
  maxCapacity = 250,
  count = 0,
  registered = false,
  registerLoading = false,
  dataLoading = false,
  onRegister,
  feedback = { type: null, message: "" },
  user = null,
}) {
  const isFull = count >= maxCapacity;

  return (
    <div className="flex flex-col gap-4">
      {/* Dynamic Feedback Banner */}
      {feedback.message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium transition-all shadow-sm ${feedback.type === "success"
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : feedback.type === "warning"
              ? "bg-amber-50 text-amber-900 border border-amber-200"
              : feedback.type === "info"
                ? "bg-blue-50 text-blue-800 border border-blue-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
        >
          {feedback.type === "success" && (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          )}
          {feedback.type === "warning" && (
            <LogIn className="w-5 h-5 shrink-0 text-amber-600" />
          )}
          {feedback.type === "info" && (
            <Info className="w-5 h-5 shrink-0 text-blue-600" />
          )}
          {feedback.type === "error" && (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <div className="flex-1">
            <span>{feedback.message}</span>
            {!user && feedback.type === "warning" && (
              <span className="block text-xs mt-0.5 text-amber-700 font-normal">
                Vui lòng đăng nhập tài khoản của bạn để tiến hành lưu đăng ký.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-4">
        {/* Live Registration Counter */}
        <div className="flex items-center gap-2 font-bold text-gray-900 text-[15px] justify-center md:justify-start bg-gray-100 md:bg-transparent py-2 px-4 rounded-lg md:p-0">
          {dataLoading ? (
            <span className="flex items-center gap-1.5 text-gray-500 font-normal">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> Đang
              tải lượt đăng ký...
            </span>
          ) : (
            <>
              <span
                className={
                  isFull ? "text-rose-600 font-extrabold" : "text-gray-900"
                }
              >
                {count}/{maxCapacity}
              </span>
              <Users size={18} className="text-purple-700" />
            </>
          )}
        </div>

        {/* Register Button */}
        <button
          onClick={onRegister}
          disabled={registered || registerLoading || isFull}
          className={`font-bold text-[15px] rounded-xl px-8 py-3.5 transition-all flex items-center justify-center gap-2 shadow-sm ${registered
            ? "bg-emerald-600 text-white cursor-not-allowed"
            : isFull
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : registerLoading
                ? "bg-purple-500 text-white cursor-wait opacity-90"
                : "bg-purple-700 hover:bg-purple-800 text-white hover:shadow-md active:scale-[0.99]"
            }`}
        >
          {registerLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : registered ? (
            <>
              <span>Đã đăng ký ✓</span>
            </>
          ) : isFull ? (
            <span>Hết chỗ</span>
          ) : (
            <>
              <span>Đăng kí ngay</span>
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default RegisterActionBar;
