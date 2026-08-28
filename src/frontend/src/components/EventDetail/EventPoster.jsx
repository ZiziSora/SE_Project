import { useState } from "react";
import { FALLBACK_POSTER_IMAGE } from "../../utils/eventDetailUtils.js";

/* =========================================================
   EventPoster Component - Xử lý ảnh & Fallback chuẩn
   ========================================================= */
export function EventPoster({ imageUrl, title, alt }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const imgSrc = imageUrl === failedSrc ? FALLBACK_POSTER_IMAGE : imageUrl;

  return (
    <div className="group relative h-full w-full overflow-hidden bg-white/75 p-3 backdrop-blur-xl md:p-5">
      {imgSrc ? (
        <>
          <img
            src={imgSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full scale-110 object-cover opacity-15 blur-3xl saturate-75"
          />
          <div className="pointer-events-none absolute inset-0 bg-white/60" />
          <img
            src={imgSrc}
            alt={title || alt || "Banner sự kiện"}
            className="relative z-10 size-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.015]"
            onError={(e) => {
              if (e.target.src !== FALLBACK_POSTER_IMAGE) {
                e.target.onerror = null;
                setFailedSrc(imageUrl);
              }
            }}
          />
        </>
      ) : (
        <div className="flex size-full min-h-80 flex-col items-center justify-center bg-gradient-to-br from-white/90 via-violet-50/85 to-fuchsia-100/75 p-6 text-center text-violet-900">
          <svg
            className="w-12 h-12 mb-2 opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm font-semibold">Hình ảnh sự kiện đang được cập nhật</p>
        </div>
      )}
    </div>
  );
}

export default EventPoster;
