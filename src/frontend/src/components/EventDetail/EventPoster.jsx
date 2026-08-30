import { useState } from "react";
import { FALLBACK_POSTER_IMAGE } from "../../utils/eventDetailUtils.js";
import { CalendarDays } from "lucide-react";

/* =========================================================
   EventPoster Component - Xử lý ảnh & Fallback chuẩn
   ========================================================= */
export function EventPoster({ imageUrl, title, alt }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const imgSrc = imageUrl === failedSrc ? FALLBACK_POSTER_IMAGE : imageUrl;

  return (
    <div className="group relative h-full min-h-[22rem] w-full overflow-hidden bg-slate-50">
      {imgSrc ? (
        <>
          {/* Blurred backdrop */}
          <img
            src={imgSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full scale-110 object-cover opacity-20 blur-3xl saturate-50"
          />
          {/* Overlay to soften backdrop */}
          <div className="pointer-events-none absolute inset-0 bg-white/55" />
          {/* Main poster image */}
          <img
            src={imgSrc}
            alt={title || alt || "Banner sự kiện"}
            className="relative z-10 h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            onError={(e) => {
              if (e.target.src !== FALLBACK_POSTER_IMAGE) {
                e.target.onerror = null;
                setFailedSrc(imageUrl);
              }
            }}
          />
        </>
      ) : (
        /* Gradient placeholder */
        <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet-50 via-fuchsia-50/60 to-white p-8 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-violet-100">
            <CalendarDays size={28} className="text-violet-500" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-slate-400">
            Hình ảnh sự kiện đang được cập nhật
          </p>
        </div>
      )}
    </div>
  );
}

export default EventPoster;
