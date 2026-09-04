import { Clock3, Inbox, UserCheck } from "lucide-react";

export default function StatStrip({ totalRequests, pendingRequests, processedRequests }) {
  const stats = [
    {
      label: "Tổng yêu cầu",
      value: totalRequests,
      detail: "Trong toàn hệ thống",
      icon: Inbox,
      iconClass: "bg-[#eee7ff] text-[#6d20df]",
    },
    {
      label: "Đang chờ xử lý",
      value: pendingRequests,
      detail: "Cần quản trị viên xem xét",
      icon: Clock3,
      iconClass: "bg-[#fff3cf] text-[#9a6800]",
    },
    {
      label: "Đã xử lý",
      value: processedRequests,
      detail: "Đã chấp nhận hoặc từ chối",
      icon: UserCheck,
      iconClass: "bg-[#e7f6ef] text-[#137154]",
    },
  ];

  return (
    <section
      className="review-reveal grid grid-flow-dense grid-cols-1 overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_16px_45px_rgba(45,31,61,0.06)] sm:grid-cols-3"
      style={{ animationDelay: "100ms" }}
      aria-label="Tổng quan yêu cầu"
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <article
            key={stat.label}
            className={`group flex min-h-[126px] items-center gap-4 p-5 transition-colors duration-300 hover:bg-[#fbf9fe] sm:p-6 ${
              index < stats.length - 1
                ? "border-b border-[#e7e1ec] sm:border-b-0 sm:border-r"
                : ""
            }`}
          >
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-[14px] transition-transform duration-500 ease-out group-hover:scale-105 ${stat.iconClass}`}
            >
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <strong className="font-['Manrope'] text-[28px] font-bold leading-none tracking-[-0.04em] text-[#172235]">
                  {stat.value}
                </strong>
                <span className="truncate text-sm font-semibold text-[#393142]">{stat.label}</span>
              </div>
              <p className="mt-2 truncate text-xs text-[#7a7183]">{stat.detail}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
