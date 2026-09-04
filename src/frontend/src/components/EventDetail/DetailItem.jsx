/* =========================================================
   Reusable DetailItem
   ========================================================= */
export function DetailItem({ icon: Icon, label, value, subValue, className = "" }) {
  return (
    <div
      className={`group flex min-h-28 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_12px_32px_-20px_rgba(91,33,182,0.55)] ${className}`}
    >
      <div className="grid size-8 place-items-center rounded-full bg-violet-100 text-violet-700 transition-transform duration-300 group-hover:scale-110">
        <Icon size={15} strokeWidth={2} />
      </div>
      <div className="mt-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
          {label}
        </p>
        <p className="line-clamp-2 text-[13px] font-bold leading-5 tracking-[-0.01em] text-[#21182c]">
          {value}
        </p>
        {subValue && (
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{subValue}</p>
        )}
      </div>
    </div>
  );
}

export default DetailItem;
