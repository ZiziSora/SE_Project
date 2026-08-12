export default function AdminReviewStatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "violet",
}) {
  const toneClasses = {
    violet: "bg-[#eee7ff] text-[#6d20df]",
    blue: "bg-[#eaf2ff] text-[#3766b5]",
    green: "bg-[#e7f6ef] text-[#137154]",
    red: "bg-[#fff0ef] text-[#b5453f]",
  };

  return (
    <article className="group min-h-[150px] bg-white p-5 transition-colors duration-300 hover:bg-[#fcfaff] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#766e80]">
            {label}
          </p>
          <p className="mt-3 font-['Cabinet_Grotesk','Manrope',sans-serif] text-4xl font-bold leading-none tracking-[-0.045em] text-[#172235]">
            {value}
          </p>
        </div>
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-[14px] transition-transform duration-700 ease-out group-hover:scale-105 ${toneClasses[tone]}`}
        >
          <Icon className="size-5" strokeWidth={1.9} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#918897]">{helper}</p>
    </article>
  );
}
