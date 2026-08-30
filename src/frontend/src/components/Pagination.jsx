import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Phân trang dùng chung (Khám phá + Trang chủ Ban tổ chức).
 *
 * Hai nút cùng một kiểu nền trắng, chỉ khác hướng mũi tên — trước đây nút
 * "Trang sau" màu tím còn "Trang trước" màu xám nên trông như hai chức năng
 * khác nhau. Rê chuột vào thì nền đậm lên để biết nút đang được trỏ tới.
 */
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const buttonClass =
    "grid size-9 place-items-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors duration-200 cursor-pointer hover:bg-gray-200 hover:text-gray-900 hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-600";

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-4"
      aria-label="Phân trang danh sách sự kiện"
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        aria-label="Trang trước"
        title="Trang trước"
        className={buttonClass}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      <span className="text-sm font-medium text-gray-500" aria-live="polite">
        Trang {currentPage} / {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        aria-label="Trang sau"
        title="Trang sau"
        className={buttonClass}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
