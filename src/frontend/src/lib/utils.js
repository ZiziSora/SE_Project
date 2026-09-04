import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Gộp className có điều kiện rồi khử xung đột giữa các class Tailwind.
 * Bản JS của `lib/utils.ts` — nếu file gốc của bạn có thêm hàm khác thì
 * chép nốt sang đây, chỉ cần bỏ phần khai báo kiểu.
 *
 * @param {...any} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
