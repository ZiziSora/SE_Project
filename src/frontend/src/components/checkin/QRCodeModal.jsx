import { useState, useEffect } from "react";
import {
  X,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { getMyQrCode } from "../../api/checkinApi.js";

export default function QRCodeModal({ eventId, eventTitle, isOpen, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    let isMounted = true;
    async function fetchQR() {
      try {
        setLoading(true);
        setError(null);
        const data = await getMyQrCode(eventId);
        if (isMounted) {
          setQrData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.detail ||
            "Không thể lấy mã QR. Vui lòng thử lại sau."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchQR();

    return () => {
      isMounted = false;
    };
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  // 1. Fallback linh hoạt để không bao giờ bị undefined chuỗi QR
  const tokenToEncode = qrData?.qr_token || qrData?.token || qrData?.data?.qr_token || "";
  const qrImageUrl = tokenToEncode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
      tokenToEncode
    )}`
    : "";

  const isCheckedIn = qrData?.registration_status === "CHECKED_IN";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <QrCode className="w-4 h-4" />
            Vé Check-in Sự kiện
          </div>
          <h2 className="text-lg font-bold text-white line-clamp-1 pr-8">
            {qrData?.event_title || eventTitle || "Sự kiện UniEvent"}
          </h2>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[80vh] flex flex-col items-center">
          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
              <p className="text-sm font-medium">Đang tạo mã QR Check-in...</p>
            </div>
          ) : error ? (
            <div className="py-10 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Không thể tải QR</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">{error}</p>
              <button
                onClick={onClose}
                className="mt-5 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          ) : (
            <>
              {/* Status Badge */}
              <div className="w-full mb-4">
                {isCheckedIn ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-800">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">
                        Đã Check-in thành công
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        {qrData.checked_in_at
                          ? `Điểm danh lúc: ${new Date(
                            qrData.checked_in_at
                          ).toLocaleString("vi-VN")}`
                          : "Vé đã được xác nhận điểm danh."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 flex items-center justify-between text-purple-900">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      Mã QR hợp lệ
                    </div>
                    <span className="text-[11px] font-medium text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full">
                      Sẵn sàng quét điểm danh
                    </span>
                  </div>
                )}
              </div>

              {/* QR Image Box */}
              <div className="relative group p-4 bg-white border-2 border-dashed border-purple-200 rounded-3xl shadow-inner flex flex-col items-center w-full">
                <div className="relative w-56 h-56 rounded-2xl overflow-hidden bg-white p-2 border border-gray-100 shadow-xs flex items-center justify-center">
                  <img
                    src={qrImageUrl}
                    alt="QR Checkin Code"
                    className={`w-full h-full object-contain transition duration-300 ${isCheckedIn ? "opacity-40 grayscale" : ""
                      }`}
                  />
                  {isCheckedIn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/20 backdrop-blur-[1px]">
                      <span className="bg-emerald-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase">
                        <CheckCircle2 className="w-4 h-4" /> Đã sử dụng
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-2 font-medium">
                  Đưa mã này cho Ban tổ chức để điểm danh khi đến nơi
                </p>
              </div>
            </>
          )}
        </div>


        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-medium">
            Hệ sinh thái UniEvent Check-in
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition shadow-xs"
          >
            Đóng vé
          </button>
        </div>
      </div>
    </div>
  );
}
