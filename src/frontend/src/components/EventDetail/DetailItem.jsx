/* =========================================================
   Reusable DetailItem
   ========================================================= */
export function DetailItem({ icon: Icon, label, value, subValue, className = "" }) {
  return (
    <div
      className={`group flex min-h-32 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition duration-500 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_18px_45px_-32px_rgba(91,33,182,0.65)] ${className}`}
    >
      <div className="grid size-8 place-items-center rounded-full bg-violet-100 text-violet-700 transition-transform duration-500 group-hover:scale-110">
        <Icon size={15} />
      </div>
      <div className="mt-4">
        <p className="mb-1 text-[11px] font-semibold text-slate-500">
          {label}
        </p>
        <p className="line-clamp-2 text-sm font-semibold leading-5 tracking-[-0.015em] text-[#21182c]">{value}</p>
        {subValue && (
          <p className="mt-0.5 text-xs leading-4 text-slate-500">{subValue}</p>
        )}
      </div>
    </div>
  );
}

export default DetailItem;
