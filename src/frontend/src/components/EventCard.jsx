import { Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80";

export default function EventCard({
    eventId,
    image,
    badgeText,
    title,
    faculty,
    date,
    location,
    isFeatured = false,
    role,
}) {
    const isOrganizer = role === "organizer";
    const detailPath = `/events/${eventId}`;

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
                    onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = DEFAULT_IMAGE;
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                {badgeText && (
                    <span className="absolute top-2.5 left-2.5 bg-[#6D28D9] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">
                        {badgeText}
                    </span>
                )}

                {isFeatured && (
                    <span className="absolute top-2.5 right-2.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full border border-white/30">
                        ✨ Nổi bật
                    </span>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1 gap-2">
                <h3 className={`font-bold text-gray-800 leading-snug line-clamp-2 ${isFeatured ? "text-base" : "text-sm"}`}>
                    {title || "Tên sự kiện chưa cập nhật"}
                </h3>

                <p className="text-xs text-gray-400 font-medium">
                    {faculty || "Đơn vị tổ chức"}
                </p>

                <div className="flex flex-col gap-1 mt-auto pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]" />
                        <span className="truncate">{date || "Thời gian chưa xác định"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]" />
                        <span className="truncate">{location || "Địa điểm chưa xác định"}</span>
                    </div>
                </div>

                <div className="flex gap-2 mt-3">
                    <Link
                        to={detailPath}
                        className={`flex-1 py-2 px-3 text-center text-xs font-semibold rounded-lg transition active:scale-[0.98] ${
                            isOrganizer
                                ? "text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-sm"
                                : "border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                    >
                        Xem thông tin
                    </Link>
                    {!isOrganizer && (
                        <Link
                            to={detailPath}
                            className="flex-1 py-2 px-3 text-center text-xs font-semibold rounded-lg text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.98] transition shadow-sm"
                        >
                            Đăng ký
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
