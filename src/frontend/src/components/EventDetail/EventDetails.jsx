import { DetailItem } from "./DetailItem.jsx";

/* =========================================================
   Event Details Grid Component
   ========================================================= */
export function EventDetails({ schedule, details }) {
  const ScheduleIcon = schedule.icon;

  return (
    <div className="grid grid-flow-dense grid-cols-2 gap-2.5 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="group col-span-2 overflow-hidden rounded-2xl bg-violet-50 p-4 text-[#21182c]">
        <div className="mb-3 flex items-center gap-2.5">
          <ScheduleIcon className="size-4 text-violet-700" />
          <p className="text-xs font-semibold text-slate-500">Lịch trình</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {schedule.items.map((item) => (
            <div
              key={item.label}
              className="min-w-0 border-t border-violet-200 pt-3 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:px-3 sm:pt-0 sm:first:border-l-0 sm:first:pl-0"
            >
              <p className="text-[11px] font-semibold text-violet-700">{item.label}</p>
              <p className="mt-1 text-[13px] font-semibold leading-5">{item.value}</p>
              <p className="text-xs text-slate-500">{item.subValue}</p>
            </div>
          ))}
        </div>
      </div>
      {details.map((item, i) => (
        <DetailItem key={item.label || i} {...item} />
      ))}
    </div>
  );
}

export default EventDetails;
