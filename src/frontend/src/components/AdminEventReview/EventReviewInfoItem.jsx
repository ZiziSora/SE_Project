export default function EventReviewInfoItem({ icon: Icon, label, children }) {
  return (
    <div className="group flex min-h-[124px] gap-4 border-b border-[#e7e1ec] p-5 last:border-b-0 sm:p-6 md:border-r md:[&:nth-child(2n)]:border-r-0 md:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[#f0eaff] text-[#6d20df] transition-transform duration-700 ease-out group-hover:scale-105">
        <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#857c8d]">
          {label}
        </p>
        <div className="mt-2 text-sm font-semibold leading-5 text-[#243247]">
          {children}
        </div>
      </div>
    </div>
  );
}
