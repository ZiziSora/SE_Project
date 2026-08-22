import { Search } from "lucide-react";

import { cn } from "../../lib/utils";
import { ATTENDANCE_FILTERS, formatNumber } from "../../utils/participantUtils.js";

/** Hàng bộ lọc trạng thái điểm danh + ô tìm kiếm sinh viên. */
export default function ParticipantFilterBar({
  activeFilter,
  onFilterChange,
  counts,
  search,
  onSearchChange,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {ATTENDANCE_FILTERS.map((filter) => {
          const isActive = filter.key === activeFilter;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => onFilterChange(filter.key)}
              aria-pressed={isActive}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 font-mono text-[0.8125rem] font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-primary/80 hover:bg-accent",
              )}
            >
              {filter.label} ({formatNumber(counts?.[filter.key] ?? 0)})
            </button>
          );
        })}
      </div>

      <div className="relative w-full max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên, MSSV hoặc email sinh viên"
          aria-label="Tìm theo tên, MSSV hoặc email sinh viên"
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}
