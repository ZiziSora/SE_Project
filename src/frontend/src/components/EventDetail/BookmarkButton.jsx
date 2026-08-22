import { Bookmark, Loader2 } from "lucide-react";

/* =========================================================
   Bookmark Button Component - Lưu sự kiện (chỉ dành cho Sinh viên)
   ========================================================= */
export function BookmarkButton({ saved = false, loading = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-pressed={saved}
      aria-label={saved ? "Bỏ lưu sự kiện" : "Lưu sự kiện"}
      title={saved ? "Bỏ lưu sự kiện" : "Lưu sự kiện"}
      className={`group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 ${
        saved
          ? "border-violet-700 bg-violet-700 text-white hover:bg-violet-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>Đang cập nhật</span>
        </>
      ) : (
        <>
          <Bookmark
            className="size-4 transition-transform duration-300 group-hover:scale-105"
            fill={saved ? "currentColor" : "none"}
            strokeWidth={2}
          />
          <span>{saved ? "Đã lưu" : "Lưu sự kiện"}</span>
        </>
      )}
    </button>
  );
}

export default BookmarkButton;
