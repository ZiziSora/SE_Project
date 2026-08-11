const STATUS_CONFIG = {
  pending: {
    label: "Chờ xét duyệt",
    dotClass: "bg-[#d99a00]",
    className: "border-[#edd792] bg-[#fff9e8] text-[#7a5200]",
  },
  approved: {
    label: "Đã chấp nhận",
    dotClass: "bg-[#11865b]",
    className: "border-[#b8dfcc] bg-[#edf9f3] text-[#146647]",
  },
  rejected: {
    label: "Đã từ chối",
    dotClass: "bg-[#c73636]",
    className: "border-[#e8c4c4] bg-[#fff2f2] text-[#963333]",
  },
};

export default function StatusBadge({ status }) {
  const currentStatus = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${currentStatus.className}`}
    >
      <span className={`size-1.5 rounded-full ${currentStatus.dotClass}`} />
      {currentStatus.label}
    </span>
  );
}
