import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "../../lib/utils";
import ParticipantRow from "./ParticipantRow.jsx";
import { formatNumber } from "../../utils/participantUtils.js";

const headers = [
  "SINH VIÊN",
  "MSSV",
  "EMAIL",
  "THỜI GIAN ĐĂNG KÝ",
  "TRẠNG THÁI",
  "GIỜ ĐIỂM DANH",
  "THAO TÁC",
];

const messageCellCls = "border-t border-border px-5 py-8 text-center text-sm";

/** Bảng danh sách người tham gia kèm phân trang. */
export default function ParticipantTable({
  participants,
  loading,
  error,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onCheckIn,
  checkingId,
}) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="min-h-0 flex-auto overflow-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="bg-secondary/60">
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-5 py-3 font-mono text-[0.75rem] font-medium tracking-wider text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length} className={cn(messageCellCls, "text-muted-foreground")}>
                  Đang tải danh sách người tham gia...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={headers.length} className={cn(messageCellCls, "text-destructive")}>
                  {error}
                </td>
              </tr>
            ) : participants.filter(
                (p) => p.registration_status !== "WAITLISTED" && p.registration_status !== "WAITLIST"
              ).length === 0 ? (
              <tr>
                <td colSpan={headers.length} className={cn(messageCellCls, "text-muted-foreground")}>
                  Không tìm thấy người tham gia nào.
                </td>
              </tr>
            ) : (
              participants
                .filter(
                  (p) => p.registration_status !== "WAITLISTED" && p.registration_status !== "WAITLIST"
                )
                .map((participant) => (
                  <ParticipantRow
                    key={participant.registration_id}
                    participant={participant}
                    onCheckIn={onCheckIn}
                    isSubmitting={checkingId === participant.registration_id}
                  />
                ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-sm text-muted-foreground">
          Hiển thị {formatNumber(rangeStart)} - {formatNumber(rangeEnd)} trong số{" "}
          {formatNumber(total)} người tham gia
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Trang trước"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Trang sau"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
