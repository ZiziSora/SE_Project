import { getAttendanceDisplay } from "../../utils/participantUtils.js";

/** Nhãn trạng thái điểm danh của một người tham gia. */
export default function AttendanceBadge({ participant }) {
  const status = getAttendanceDisplay(participant);

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
    >
      <span className={`size-1.5 rounded-full ${status.dotClass}`} aria-hidden="true" />
      {status.label}
    </span>
  );
}
