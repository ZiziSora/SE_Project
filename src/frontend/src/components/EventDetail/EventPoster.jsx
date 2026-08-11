import { useState, useEffect } from "react";
import { FALLBACK_POSTER_IMAGE } from "../../utils/eventDetailUtils.js";

/* =========================================================
   EventPoster Component - Xử lý ảnh & Fallback chuẩn
   ========================================================= */
export function EventPoster({ imageUrl, title, alt }) {
  const [imgSrc, setImgSrc] = useState(imageUrl);

  useEffect(() => {
    setImgSrc(imageUrl);
  }, [imageUrl]);

  return (
    <div className="bg-[#EEE8F9] rounded-2xl p-5 flex justify-center mb-8 shadow-sm">
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={title || alt || "Event Poster"}
          className="w-full max-w-2xl rounded-xl object-cover shadow-md transition-all hover:shadow-lg aspect-[16/9]"
          onError={(e) => {
            console.warn("Poster image load failed, reverting to fallback:", imgSrc);
            if (e.target.src !== FALLBACK_POSTER_IMAGE) {
              e.target.onerror = null;
              setImgSrc(FALLBACK_POSTER_IMAGE);
            }
          }}
        />
      ) : (
        /* Khung hiển thị mặc định nếu chưa upload banner lên Supabase Storage */
        <div className="w-full max-w-2xl h-64 md:h-80 rounded-xl bg-purple-100 border-2 border-dashed border-purple-300 flex flex-col items-center justify-center text-purple-600 p-6 text-center">
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
          <p className="font-semibold text-sm">Chưa có Banner cho sự kiện này</p>
          <p className="text-xs text-purple-400 mt-1">
            Cập nhật link banner vào cột banner_url trên Supabase Storage bucket 'event-banners'
          </p>
        </div>
      )}
    </div>
  );
}

export default EventPoster;
