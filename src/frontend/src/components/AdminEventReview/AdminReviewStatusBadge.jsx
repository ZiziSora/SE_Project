import { CheckCircle2, Clock3, XCircle } from "lucide-react";

const STATUS_STYLES = {
  PENDING: {
    label: "Đang chờ duyệt",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    Icon: Clock3,
  },
  APPROVED: {
    label: "Đã phê duyệt",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
  REJECTED: {
    label: "Đã từ chối",
    className: "border-red-200 bg-red-50 text-red-700",
    Icon: XCircle,
  },
};

export default function AdminReviewStatusBadge({ status }) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  const Icon = config.Icon;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}
    >
      <Icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
      {config.label}
    </span>
  );
}
