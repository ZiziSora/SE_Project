/* =========================================================
   Reusable DetailItem
   ========================================================= */
export function DetailItem({ icon: Icon, label, value, subValue }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[11px] font-bold tracking-wide text-gray-500 uppercase mb-1">
          {label}
        </p>
        <p className="text-[15px] font-bold text-gray-900">{value}</p>
        {subValue && (
          <p className="text-[13px] text-gray-500 mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

export default DetailItem;
