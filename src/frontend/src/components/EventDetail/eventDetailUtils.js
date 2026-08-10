// Hằng số & hàm bổ trợ dùng chung cho các component trang chi tiết sự kiện

// Event ID mặc định hiển thị trên UniEvent
export const DEFAULT_EVENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const FALLBACK_POSTER_IMAGE =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80";

/**
 * Định dạng chuỗi ISO hoặc Date sang kiểu Ngày tiếng Việt (VD: "30 Tháng 5, 2026")
 */
export function formatVietnameseDate(dateString) {
  if (!dateString) return "Chưa cập nhật";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day} Tháng ${month}, ${year}`;
  } catch (err) {
    console.error("Lỗi định dạng ngày:", err);
    return String(dateString);
  }
}

/**
 * Định dạng giờ sang chuẩn tiếng Việt (VD: "13:30 CHIỀU" hoặc "09:00 SÁNG")
 */
export function formatVietnameseTime(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const hours = date.getHours() % 12;
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = date.getHours() >= 12 ? "CHIỀU" : "SÁNG";
    const formattedHours = hours.toString().padStart(2, "0");
    return `${formattedHours}:${minutes} ${period}`;
  } catch (err) {
    console.error("Lỗi định dạng giờ:", err);
    return "";
  }
}
