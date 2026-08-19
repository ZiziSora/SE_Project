import { ArrowDown, ArrowRight } from "lucide-react";

/**
 * Bảng so sánh "dữ liệu cũ → dữ liệu mới" của một yêu cầu chỉnh sửa sự kiện.
 *
 * Backend đã định dạng sẵn `old_text` / `new_text` (ngày giờ tiếng Việt, tên
 * danh mục, tên tệp...) nên ở đây chỉ việc gạch bỏ phần cũ rồi in phần mới.
 * Dùng chung cho cả màn hình của Ban tổ chức lẫn màn hình duyệt của Admin.
 *
 * @param {object} props
 * @param {Array<{field:string,label:string,old_text:string,new_text:string}>} props.changes
 * @param {boolean} [props.compact] Bỏ khung viền ngoài, dùng khi nhúng vào card khác
 */
export default function EventRevisionDiff({ changes = [], compact = false }) {
  if (!changes.length) {
    return (
      <p className="text-xs text-slate-400">
        Không có thay đổi nào được ghi nhận.
      </p>
    );
  }

  return (
    <ul
      className={
        compact
          ? "divide-y divide-slate-100"
          : "divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white"
      }
    >
      {changes.map((change) => (
        <li key={change.field} className="px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {change.label}
          </p>
          {/* Bảng tóm tắt cố tình dùng cỡ chữ nhỏ cho gọn */}
          <div className="text-xs leading-5">
            <RevisionValueDiff change={change} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Cố ý KHÔNG đặt cỡ chữ ở đây: component được nhúng vào nhiều ngữ cảnh có cỡ
// chữ khác nhau (bảng tóm tắt nhỏ của Ban tổ chức, ô thông tin cỡ thường của
// trang duyệt). Đặt cứng `text-xs` sẽ làm chữ bé lạc lõng giữa các ô xung quanh.
const OLD_TEXT_CLS = "text-slate-400 line-through decoration-red-400/70";
const NEW_TEXT_CLS = "font-semibold text-emerald-700";

/**
 * Một cặp giá trị "cũ → mới". Tách riêng và export để trang duyệt của Admin
 * nhúng thẳng vào từng ô thông tin của sự kiện, thay vì chỉ hiện ở bảng tóm tắt.
 *
 * Xếp NGANG cho dễ liếc; chỉ khi nội dung thực sự dài mới xếp DỌC, vì lúc đó
 * hai đoạn văn nằm cạnh nhau sẽ không đọc được đâu là cũ đâu là mới. Cố ý KHÔNG
 * dựa vào tên trường (mô tả ngắn vẫn nên nằm ngang như các trường khác).
 */
export function RevisionValueDiff({ change }) {
  const oldText = change.old_text ?? "";
  const newText = change.new_text ?? "";
  const isLong = oldText.length + newText.length > 80;

  if (isLong) {
    return (
      <div className="mt-1.5 space-y-2">
        <p className={`${OLD_TEXT_CLS} whitespace-pre-wrap break-words`}>
          {oldText}
        </p>
        <div className="flex items-start gap-1.5">
          <ArrowDown
            className="mt-1 size-[1em] shrink-0 text-slate-300"
            aria-hidden="true"
          />
          <p className={`${NEW_TEXT_CLS} whitespace-pre-wrap break-words`}>
            {newText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className={`${OLD_TEXT_CLS} break-words`}>{oldText}</span>
      <ArrowRight
        className="size-[1em] shrink-0 text-slate-300"
        aria-hidden="true"
      />
      <span className={`${NEW_TEXT_CLS} break-words`}>{newText}</span>
    </div>
  );
}
