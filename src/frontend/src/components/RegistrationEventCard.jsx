import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, MapPin, QrCode } from "lucide-react";
import QRCodeModal from "./checkin/QRCodeModal.jsx";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80";

export default function RegistrationEventCard({
  item,
  getEffectiveStatus,
  canCancelRegistration,
  formatEventDate,
  onSelectCancel,
}) {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const event = item.events || {};
  const { month, day, time } = formatEventDate(event.start_time, event.end_time);
  const categoryName = event.event_categories?.name || "Hội thảo Học thuật";
  const banner = event.banner_url || DEFAULT_IMAGE;
  const effectiveStatus = getEffectiveStatus(item);

  const isCancelled = effectiveStatus === "CANCELLED";
  const isWaitlisted = effectiveStatus === "WAITLISTED";
  const isAttended = effectiveStatus === "ATTENDED";
  const isAbsent = effectiveStatus === "ABSENT";
  const isUpcoming = effectiveStatus === "REGISTERED";
  const canCancel = canCancelRegistration(event.start_time);

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between relative group">
        <div>
          <div className="relative h-52 w-full bg-gray-100">
            <img
              src={banner}
              alt={event.title || "Sự kiện"}
              className="w-full h-full object-cover"
              onError={(imageEvent) => {
                imageEvent.currentTarget.onerror = null;
                imageEvent.currentTarget.src = DEFAULT_IMAGE;
              }}
            />
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-center shadow-sm border border-gray-100">
              <span className="block text-[10px] font-bold text-red-500 uppercase tracking-wider">
                {month}
              </span>
              <span className="block text-base font-black text-gray-900 leading-none">
                {day}
              </span>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-block bg-[#f3e8ff] text-[#7e22ce] text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                {categoryName}
              </span>

              {isCancelled && (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Đã hủy đăng ký
                </span>
              )}
              {isWaitlisted && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" /> Danh sách chờ
                </span>
              )}
              {isAttended && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Đã tham gia
                </span>
              )}
              {isAbsent && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Vắng mặt
                </span>
              )}
              {isUpcoming && (
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Sắp diễn ra
                </span>
              )}
            </div>

            <h3 className="font-bold text-base text-gray-900 leading-snug line-clamp-2 min-h-[2.75rem]">
              {event.title || "Tên sự kiện chưa cập nhật"}
            </h3>

            <div className="mt-4 space-y-1.5 text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">
                  {event.location || "Địa điểm chưa xác định"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 flex items-center gap-2">
          {isAttended ? (
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="w-full text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Xem Vé QR (Đã điểm danh)
            </button>
          ) : isWaitlisted ? (
            <>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="w-full text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-amber-600" />
                Danh sách chờ (Xem vé)
              </button>

              {canCancel ? (
                <button
                  onClick={() => onSelectCancel(item)}
                  title="Hủy đăng ký"
                  className="px-3 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl transition text-xs font-semibold flex items-center gap-1 shrink-0 active:scale-[0.98]"
                >
                  Hủy
                </button>
              ) : (
                <button
                  disabled
                  title="Thời hạn hủy đăng ký đã hết (phải trước 5 ngày khi sự kiện diễn ra)"
                  className="px-3 py-2.5 border border-gray-200 text-gray-400 bg-gray-100 rounded-xl transition text-xs font-semibold flex items-center gap-1 shrink-0 cursor-not-allowed whitespace-nowrap"
                >
                  Hết hạn hủy
                </button>
              )}
            </>
          ) : isAbsent ? (
            <button
              disabled
              className="w-full text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition bg-amber-50 text-amber-800 border border-amber-200 cursor-default"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Vắng mặt (Chưa điểm danh)
            </button>
          ) : isCancelled ? (
            <button
              disabled
              className="w-full text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
            >
              <QrCode className="w-4 h-4" />
              Đã hủy đăng ký
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="w-full text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-sm bg-[#6D28D9] hover:bg-[#7E22CE] text-white active:scale-[0.99] cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                Xem QR Check-in
              </button>

              {canCancel ? (
                <button
                  onClick={() => onSelectCancel(item)}
                  title="Hủy đăng ký (yêu cầu trước 5 ngày)"
                  className="px-3 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl transition text-xs font-semibold flex items-center gap-1 shrink-0 active:scale-[0.98]"
                >
                  Hủy
                </button>
              ) : (
                <button
                  disabled
                  title="Thời hạn hủy đăng ký đã hết (phải trước 5 ngày khi sự kiện diễn ra)"
                  className="px-3 py-2.5 border border-gray-200 text-gray-400 bg-gray-100 rounded-xl transition text-xs font-semibold flex items-center gap-1 shrink-0 cursor-not-allowed whitespace-nowrap"
                >
                  Hết hạn hủy
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <QRCodeModal
        eventId={event.event_id}
        eventTitle={event.title}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </>
  );
}

