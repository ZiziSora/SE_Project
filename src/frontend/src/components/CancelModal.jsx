import { AlertTriangle, X, Loader2, Clock, MapPin } from "lucide-react";

export default function CancelModal({
    selectedRegistration,
    onClose,
    onConfirm,
    isCanceling,
    canCancelRegistration,
    formatEventDate,
}) {
    if (!selectedRegistration) return null;

    const isAllowed = canCancelRegistration(selectedRegistration.events?.start_time);
    const event = selectedRegistration.events || {};
    const { time } = formatEventDate(event.start_time, event.end_time);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => !isCanceling && onClose()}
                    disabled={isCanceling}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900">
                        Xác nhận hủy đăng ký sự kiện
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">
                        Bạn có chắc chắn muốn hủy đăng ký tham gia sự kiện dưới đây không?
                    </p>

                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mt-4 text-left">
                        <span className="inline-block bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md mb-1.5">
                            {event.event_categories?.name || "Sự kiện"}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900 line-clamp-2">
                            {event.title || "Sự kiện học thuật"}
                        </h4>
                        <div className="mt-2 text-[11px] text-gray-500 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span>{time}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span>{event.location || "Chưa cập nhật"}</span>
                            </div>
                        </div>
                    </div>

                    {!isAllowed ? (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 text-left font-medium">
                            ⚠️ <strong>Thời hạn hủy đã hết:</strong> Quy định hủy đăng ký yêu cầu phải thực hiện trước khi sự kiện diễn ra ít nhất 5 ngày.
                        </div>
                    ) : (
                        <p className="text-[11px] text-red-500 font-medium mt-3">
                            * Lưu ý: Thao tác này sẽ cập nhật trạng thái hủy và ghế của bạn có thể được chuyển cho sinh viên khác (Yêu cầu thực hiện trước 5 ngày).
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3 mt-6">
                    <button
                        onClick={onClose}
                        disabled={isCanceling}
                        className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-50"
                    >
                        Bỏ qua
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isCanceling || !isAllowed}
                        className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCanceling ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Đang xử lý...</span>
                            </>
                        ) : (
                            <span>Xác nhận hủy</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}