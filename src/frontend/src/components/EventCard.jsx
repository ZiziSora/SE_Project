import { useState } from "react";
import {
    CalendarDays,
    Clock3,
    Loader2,
    MapPin,
    Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { publicEventApi } from "../api/eventApi.js";
import {
    formatCapacity,
    formatEventDay,
    formatEventTimeRange,
    isEventFull,
    resolveCategoryName,
    resolveOrganizerName,
} from "../utils/eventFormat.js";

const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80";

/**
 * Thẻ sự kiện dùng chung.
 *
 * - `role="organizer"`: chỉ xem, KHÔNG có nút đăng ký (Ban tổ chức không tham
 *   gia sự kiện của trường với tư cách người tham dự).
 * - Student: nút "Đăng ký" gọi thẳng API ngay trên thẻ. Trước đây nút này chỉ
 *   là một link sang trang chi tiết, người dùng phải bấm đăng ký lần thứ hai.
 */
export default function EventCard({
    eventId,
    image,
    title,
    location,
    isFeatured = false,
    reason,
    role,
    event = {},
    startTime,
    endTime,
    categoryName,
    organizerName,
    registeredCount,
    capacity,
    registered: registeredProp = false,
    waitlisted: waitlistedProp = false,
    canRegister = true,
    onRegistered,
}) {
    const isOrganizer = role === "organizer";
    const detailPath = `/events/${eventId}`;

    const resolvedStart = startTime ?? event.start_time;
    const resolvedEnd = endTime ?? event.end_time;
    const resolvedCategory = categoryName ?? resolveCategoryName(event);
    const resolvedOrganizer = organizerName ?? resolveOrganizerName(event);
    const resolvedCapacity = capacity ?? event.capacity;

    const [count, setCount] = useState(
        Number(registeredCount ?? event.registered_count) || 0,
    );
    const [registered, setRegistered] = useState(registeredProp);
    const [waitlisted, setWaitlisted] = useState(waitlistedProp);
    const [submitting, setSubmitting] = useState(false);

    const full = isEventFull(count, resolvedCapacity);
    const showRegisterButton = !isOrganizer && canRegister;

    const handleRegister = async () => {
        if (submitting || registered) return;

        setSubmitting(true);
        try {
            const result = await publicEventApi.registerForEvent(eventId);

            setCount(Number(result.count) || count);
            setRegistered(true);
            setWaitlisted(Boolean(result.is_waitlisted));

            if (result.already_registered) {
                toast.info("Bạn đã đăng ký sự kiện này từ trước.");
            } else if (result.is_waitlisted) {
                toast.warning(
                    "Sự kiện đã hết chỗ. Bạn đã được thêm vào danh sách chờ.",
                );
            } else {
                toast.success("Đăng ký thành công! Bạn đã giữ được chỗ.");
            }

            onRegistered?.(eventId, result);
        } catch (err) {
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                toast.warning("Vui lòng đăng nhập để đăng ký tham gia sự kiện.");
            } else {
                toast.error(
                    err.response?.data?.detail ||
                        "Đăng ký thất bại. Vui lòng thử lại sau.",
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Nhãn phải NGẮN: thẻ sự kiện chỉ rộng ~80px cho mỗi nút, nhãn dài sẽ
    // xuống ba dòng và làm nút cao lệch hẳn so với nút "Xem thông tin".
    const registerLabel = registered
        ? waitlisted
            ? "Đang chờ"
            : "Đã đăng ký"
        : full
          ? "Danh sách chờ"
          : "Đăng ký";
    const registerTitle = registered
        ? waitlisted
            ? "Bạn đang ở trong danh sách chờ của sự kiện này"
            : "Bạn đã đăng ký sự kiện này"
        : full
          ? "Sự kiện đã hết chỗ — đăng ký để vào danh sách chờ"
          : "Đăng ký tham gia sự kiện";

    return (
        <div
            className={`bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-300 group ${
                isFeatured
                    ? "border-2 border-purple-300 shadow-lg shadow-purple-100 hover:shadow-xl hover:shadow-purple-200 hover:-translate-y-1"
                    : "border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            }`}
        >
            <div className={`relative overflow-hidden ${isFeatured ? "h-48" : "h-40"}`}>
                <img
                    src={image || DEFAULT_IMAGE}
                    alt={title || "Sự kiện"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(imageEvent) => {
                        imageEvent.currentTarget.onerror = null;
                        imageEvent.currentTarget.src = DEFAULT_IMAGE;
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                {/* Số chỗ đã đăng ký / tổng sức chứa */}
                <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#6D28D9] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {formatCapacity(count, resolvedCapacity)}
                </span>

                {isFeatured && (
                    <span className="absolute top-2.5 right-2.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full border border-white/30">
                        ✨ Nổi bật
                    </span>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1 gap-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="inline-block bg-[#f3e8ff] text-[#7e22ce] text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                        {resolvedCategory || "Sự kiện"}
                    </span>
                    {full && !registered && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            <Clock3 className="h-3 w-3" aria-hidden="true" />
                            Hết chỗ
                        </span>
                    )}
                </div>

                <h3
                    className={`font-bold text-gray-800 leading-snug line-clamp-2 ${
                        isFeatured ? "text-base" : "text-sm"
                    }`}
                >
                    {title || "Tên sự kiện chưa cập nhật"}
                </h3>

                <p className="text-xs text-gray-400 font-medium truncate">
                    {resolvedOrganizer || "Đơn vị tổ chức"}
                </p>

                {reason && (
                    <p className="text-xs text-[#7C3AED] italic line-clamp-2">
                        {reason}
                    </p>
                )}

                {/* Ngày, giờ và địa điểm mỗi thứ một dòng riêng: nhồi cả ngày lẫn
                    giờ vào một dòng thì thẻ hẹp sẽ cắt mất phần giờ. */}
                <div className="flex flex-col gap-1 mt-auto pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]" />
                        <span className="truncate">
                            {formatEventDay(resolvedStart) || "Ngày chưa xác định"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]" />
                        <span className="truncate">
                            {formatEventTimeRange(resolvedStart, resolvedEnd)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]" />
                        <span className="truncate">
                            {location || "Địa điểm chưa xác định"}
                        </span>
                    </div>
                </div>

                {/* `basis-0` + `min-w-0` để hai nút luôn chia đôi đúng nửa thẻ,
                    không nút nào nở theo độ dài chữ. */}
                <div className="flex items-stretch gap-2 mt-3">
                    <Link
                        to={detailPath}
                        className={`flex-1 basis-0 min-w-0 min-h-[2.75rem] px-2 inline-flex items-center justify-center text-center text-[11px] font-semibold leading-tight rounded-lg transition active:scale-[0.98] ${
                            showRegisterButton
                                ? "border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                                : "text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-sm"
                        }`}
                    >
                        Xem thông tin
                    </Link>

                    {showRegisterButton && (
                        <button
                            type="button"
                            onClick={handleRegister}
                            disabled={registered || submitting}
                            title={registerTitle}
                            aria-label={`${registerLabel} — ${title || "sự kiện"}`}
                            className={`flex-1 basis-0 min-w-0 min-h-[2.75rem] px-2 inline-flex items-center justify-center gap-1 text-center text-[11px] font-semibold leading-tight rounded-lg transition shadow-sm active:scale-[0.98] ${
                                registered
                                    ? waitlisted
                                        ? "bg-amber-50 text-amber-800 border border-amber-200 cursor-default"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                                    : submitting
                                      ? "bg-violet-400 text-white cursor-wait"
                                      : full
                                        ? "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                                        : "bg-[#7C3AED] text-white hover:bg-[#6D28D9] cursor-pointer"
                            }`}
                        >
                            {submitting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                                registerLabel
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
