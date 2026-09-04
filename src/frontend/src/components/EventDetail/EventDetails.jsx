import { DetailItem } from "./DetailItem.jsx";

/* =========================================================
   Event Details Grid Component
   ========================================================= */
export function EventDetails({ schedule, details }) {
  const ScheduleIcon = schedule.icon;

  return (
    <div className="space-y-3">
      {/* Schedule block */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50/60 p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-full bg-violet-100">
            <ScheduleIcon className="size-3.5 text-violet-700" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
            Lịch trình
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {schedule.items.map((item, idx) => (
            <div
              key={item.label}
              className={`min-w-0 ${
                idx > 0
                  ? "border-t border-violet-200/70 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
                  : ""
              }`}
            >
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600">
                {item.label}
              </p>
              <p className="text-[13px] font-bold leading-5 text-[#21182c]">
                {item.value}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{item.subValue}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Capacity + Location tiles */}
      <div className="grid grid-cols-2 gap-3">
        {details.map((item, i) => (
          <DetailItem key={item.label || i} {...item} />
        ))}
      </div>
    </div>
  );
}

export default EventDetails;
