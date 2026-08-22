import { Check, LoaderCircle } from "lucide-react";

import { cn } from "../../lib/utils";
import AttendanceBadge from "./AttendanceBadge.jsx";
import ParticipantAvatar from "./ParticipantAvatar.jsx";
import {
  formatCheckedInAt,
  formatRegisteredAt,
  isCheckedIn,
} from "../../utils/participantUtils.js";

const cellCls = "border-t border-border px-5 py-3";

/** Một dòng trong bảng danh sách người tham gia. */
export default function ParticipantRow({ participant, onCheckIn, isSubmitting }) {
  const checkedIn = isCheckedIn(participant);

  return (
    <tr>
      <td className={cn(cellCls, "max-w-[220px]")}>
        <div className="flex items-center gap-3">
          <ParticipantAvatar participant={participant} />
          <span className="line-clamp-2 text-sm font-medium text-foreground">
            {participant.full_name}
          </span>
        </div>
      </td>

      <td className={cn(cellCls, "font-mono text-sm text-muted-foreground whitespace-nowrap")}>
        {participant.student_code ?? "--"}
      </td>

      <td className={cn(cellCls, "max-w-[260px] text-sm text-muted-foreground")}>
        <span className="line-clamp-1 break-all">{participant.email ?? "--"}</span>
      </td>

      <td className={cn(cellCls, "text-sm text-muted-foreground whitespace-nowrap")}>
        {formatRegisteredAt(participant.registered_at)}
      </td>

      <td className={cn(cellCls, "whitespace-nowrap")}>
        <AttendanceBadge participant={participant} />
      </td>

      <td className={cn(cellCls, "font-mono text-sm text-muted-foreground whitespace-nowrap")}>
        {formatCheckedInAt(participant.checked_in_at)}
      </td>

      <td className={cn(cellCls, "whitespace-nowrap")}>
        {checkedIn ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600">
            <Check className="size-4" aria-hidden="true" />
            Hoàn tất
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onCheckIn(participant)}
            disabled={isSubmitting}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            )}
            Điểm danh
          </button>
        )}
      </td>
    </tr>
  );
}
