export const STATUS_LABELS = {
  DRAFT: { label: "Bản nháp", className: "bg-blue-100 text-blue-600" },
  PENDING: { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700" },
  PUBLISHED: {
    label: "Đang mở đăng ký",
    className: "bg-teal-100 text-teal-700",
  },
  ONGOING: {
    label: "Đang diễn ra",
    className: "bg-blue-100 text-blue-700",
  },
  ENDED: { label: "Đã kết thúc", className: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-600" },
};


export function getStatusDisplay(status) {
  const key = (status ?? "DRAFT").toUpperCase();
  return (
    STATUS_LABELS[key] ?? {
      label: status ?? "Bản nháp",
      className: "bg-gray-100 text-gray-600",
    }
  );
}


/**
 * Nhãn phụ đứng cạnh trạng thái chính khi sự kiện ĐANG CÔNG KHAI nhưng có một
 * yêu cầu chỉnh sửa nằm chờ Admin duyệt (bảng `event_revisions`).
 *
 * Cố tình KHÔNG gộp vào `STATUS_LABELS`: trạng thái thật của sự kiện vẫn là
 * "Đang mở đăng ký" — sinh viên vẫn đăng ký được bản cũ trong lúc chờ duyệt.
 */
export const PENDING_REVISION_BADGE = {
  label: "Chờ duyệt thay đổi",
  className: "bg-amber-100 text-amber-700",
};


/**
 * Thao tác "gỡ" một sự kiện khỏi danh sách quản lý KHÔNG giống nhau ở mọi
 * trạng thái, nên nút bấm và lời cảnh báo phải khác nhau:
 *
 * - Bản nháp: chưa từng công khai → xoá hẳn, và KHÔNG doạ người dùng về "dữ
 *   liệu đăng ký, điểm danh" vì những thứ đó chưa tồn tại.
 * - Chờ duyệt: cũng chưa công khai, nhưng đang có một yêu cầu nằm ở phía Quản
 *   trị viên → hành động đúng nghĩa là HUỶ (sự kiện chuyển sang "Đã huỷ").
 * - Đang mở đăng ký: đã có sinh viên đăng ký → HUỶ kèm lý do bắt buộc, hệ thống
 *   gửi thông báo huỷ kèm lý do đó cho từng sinh viên.
 * - Đã kết thúc / Đã huỷ: dữ liệu đăng ký và điểm danh đã tồn tại thật, nên xoá
 *   là mất luôn — giữ nguyên lời cảnh báo nặng như cũ.
 */
export const REMOVAL_MODE = {
  CANCEL: "cancel",
  DELETE: "delete",
};


const REMOVAL_ACTIONS = {
  DRAFT: {
    mode: REMOVAL_MODE.DELETE,
    title: "Xoá bản nháp?",
    description:
      "Bản nháp này sẽ bị xoá khỏi hệ thống. Sự kiện chưa từng được công khai nên không có dữ liệu đăng ký hay điểm danh nào bị ảnh hưởng. Thao tác này không thể hoàn tác.",
    confirmLabel: "Xoá bản nháp",
    actionLabel: "Xoá",
    successMessage: "Đã xoá bản nháp",
    reasonRequired: false,
  },
  PENDING: {
    mode: REMOVAL_MODE.CANCEL,
    title: "Huỷ sự kiện đang chờ duyệt?",
    description:
      "Yêu cầu duyệt sẽ bị rút lại và sự kiện chuyển sang trạng thái Đã huỷ. Sự kiện chưa được công khai nên chưa có dữ liệu đăng ký hay điểm danh. Sau khi huỷ, sự kiện không mở lại được.",
    confirmLabel: "Huỷ sự kiện",
    actionLabel: "Huỷ",
    successMessage: "Đã huỷ sự kiện",
    reasonRequired: false,
  },
  PUBLISHED: {
    mode: REMOVAL_MODE.CANCEL,
    title: "Huỷ sự kiện đang mở đăng ký?",
    description:
      "Sự kiện sẽ chuyển sang trạng thái Đã huỷ và ngừng nhận đăng ký. Toàn bộ sinh viên đã đăng ký nhận được thông báo huỷ kèm lý do bên dưới. Dữ liệu đăng ký và điểm danh vẫn được giữ lại.",
    confirmLabel: "Huỷ sự kiện",
    actionLabel: "Huỷ",
    successMessage: "Đã huỷ sự kiện và gửi thông báo cho sinh viên",
    reasonRequired: true,
  },
  DEFAULT: {
    mode: REMOVAL_MODE.DELETE,
    title: "Xoá sự kiện?",
    description:
      "Sự kiện sẽ bị xoá khỏi hệ thống cùng toàn bộ dữ liệu đăng ký và điểm danh đi kèm. Thao tác này không thể hoàn tác.",
    confirmLabel: "Xoá sự kiện",
    actionLabel: "Xoá",
    successMessage: "Đã xoá sự kiện thành công",
    reasonRequired: false,
  },
};


/** Mô tả thao tác gỡ sự kiện ứng với trạng thái hiện tại của nó. */
export function getRemovalAction(event) {
  const key = (event?.event_status ?? "DRAFT").toUpperCase();
  return REMOVAL_ACTIONS[key] ?? REMOVAL_ACTIONS.DEFAULT;
}


export const FILTER_TO_STATUS = {
  "Tất cả": undefined,
  "Đang mở đăng ký": "PUBLISHED",
  "Đang diễn ra": "ONGOING",
  "Chờ duyệt": "PENDING",
  "Bản nháp": "DRAFT",
  "Đã kết thúc": "ENDED",
  "Đã hủy": "CANCELLED",
};


export function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa cập nhật"
    : date.toLocaleString("vi-VN");
}


export function formatRegistered(event) {
  const rawCount = event.registered_count ?? 0;
  const count = event.capacity ? Math.min(rawCount, event.capacity) : rawCount;
  return `${count}/${event.capacity ?? "∞"}`;
}
/**
 * Lấy thông báo lỗi dễ đọc từ lỗi axios.
 *
 * FastAPI trả lỗi nghiệp vụ ở `detail` (chuỗi), còn lỗi validate của Pydantic là
 * mảng `[{ msg: "Value error, ..." }]`. Nếu chỉ dùng `err.message` thì người dùng
 * chỉ thấy "Request failed with status code 422" — không biết sai ở đâu.
 */
export function extractApiErrorMessage(error, fallback = "Đã xảy ra lỗi. Vui lòng thử lại.") {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => String(item?.msg ?? "").replace(/^Value error,\s*/, "").trim())
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }

  // Không có phản hồi từ server (mất mạng, backend chưa chạy...) thì message gốc
  // của axios vẫn có ích hơn câu mặc định.
  if (!error?.response && error instanceof Error && error.message) return error.message;

  return fallback;
}
