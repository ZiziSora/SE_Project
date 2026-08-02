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
      className="shrink-0 p-2 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      ) : (
        <Bookmark
          className={`w-6 h-6 transition-colors ${saved ? "text-yellow-400" : "text-gray-500 hover:text-purple-700"
            }`}
          fill={saved ? "#facc15" : "none"}
          strokeWidth={2}
        />
      )}
    </button>
  );
}

export default BookmarkButton;
