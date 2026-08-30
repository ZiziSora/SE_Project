import { Calendar, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/utils";
import {
  formatEventDateRange,
  formatRegisteredCount,
  getParticipantEventGroup,
  getProgressPercent,
} from "../../utils/participantUtils.js";

/** Thẻ sự kiện ở trang chọn sự kiện để quản lý người tham gia. */
export default function ParticipantEventCard({ event, group }) {
  // Nhãn lấy từ nhóm phân loại của trang này chứ không từ `event_status` thô:
  // "Đang mở đăng ký" và "Đang mở đăng ký + chờ duyệt thay đổi" cùng có
  // event_status = PUBLISHED nhưng là hai nhóm khác nhau với Ban tổ chức.
  const status = group ?? getParticipantEventGroup(event);
  const percent = getProgressPercent(event);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Ảnh bìa — sự kiện chưa có banner thì dùng nền chuyển sắc thay thế */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={`Ảnh bìa ${event.title}`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-accent via-secondary to-primary/15">
            <Calendar className="size-10 text-primary/40" aria-hidden="true" />
          </div>
        )}

        {status && (
          <span
            className={cn(
              "absolute right-3 top-3 rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider shadow-sm",
              status.className,
            )}
          >
            {status.label}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
          {event.title}
        </h3>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4 shrink-0" aria-hidden="true" />
          {formatEventDateRange(event)}
        </p>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersRound className="size-4 shrink-0" aria-hidden="true" />
          {formatRegisteredCount(event)}
        </p>

        {/* Thanh tiến trình thể hiện mức lấp đầy so với sức chứa */}
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Mức lấp đầy ${percent}%`}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>

        <Link
          to={`/organizer/participants/${event.event_id}`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-mono text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <UsersRound className="size-4" aria-hidden="true" />
          Quản lý người tham gia
        </Link>
      </div>
    </article>
  );
}
