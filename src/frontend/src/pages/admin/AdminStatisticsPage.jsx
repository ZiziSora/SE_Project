import {
  ArrowUpRight,
  CalendarClock,
  ChartNoAxesCombined,
  UsersRound,
} from "lucide-react";

import AdminHeader from "../../components/ReviewOrganizerRequest/AdminHeader";

export default function AdminStatisticsPage() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8f9ff] font-['Inter'] text-[#172235]">
      <AdminHeader />

      <main className="relative mx-auto w-full max-w-[1440px] px-5 pb-24 pt-12 sm:px-8 sm:pt-16 lg:px-16">
        <div
          className="pointer-events-none absolute -right-32 top-6 size-[380px] rounded-full bg-[#d9c5ff]/30 blur-[110px]"
          aria-hidden="true"
        />

        <section className="review-reveal relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)] lg:items-end">
          <div>
            <span className="inline-flex size-11 items-center justify-center rounded-[14px] bg-[#eee7ff] text-[#6d20df]">
              <ChartNoAxesCombined
                className="size-5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>
            <h1 className="mt-6 max-w-4xl font-['Manrope'] text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.055em] text-[#152033]">
              Thống kê vận hành UniEvent
            </h1>
          </div>
          <p className="border-l-2 border-[#7c3aed] pl-5 text-sm leading-6 text-[#6b6275] lg:mb-1">
            Không gian tổng hợp dữ liệu sự kiện và Ban tổ chức đang được chuẩn
            bị để hỗ trợ quản trị toàn hệ thống.
          </p>
        </section>

        <section
          className="review-reveal relative z-10 mt-12 grid grid-flow-dense gap-0 overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_22px_65px_rgba(44,29,59,0.08)] md:grid-cols-2"
          style={{ animationDelay: "120ms" }}
          aria-label="Các mô-đun thống kê sắp phát triển"
        >
          <article className="group min-h-[280px] border-b border-[#e7e1ec] p-7 transition-colors duration-300 hover:bg-[#fbf9fe] md:border-b-0 md:border-r sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#eee7ff] text-[#6d20df] transition-transform duration-700 ease-out group-hover:scale-105">
                <CalendarClock
                  className="size-5"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </span>
              <ArrowUpRight
                className="size-5 text-[#aaa1b2] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#6d20df]"
                aria-hidden="true"
              />
            </div>
            <h2 className="mt-12 font-['Manrope'] text-2xl font-bold tracking-[-0.035em] text-[#172235]">
              Sự kiện đang và sắp diễn ra
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#756c7e]">
              Theo dõi lịch tổ chức, trạng thái vận hành, lượng đăng ký và những
              sự kiện cần quản trị viên chú ý.
            </p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8194]">
              Sẽ bổ sung sau
            </p>
          </article>

          <article className="group min-h-[280px] p-7 transition-colors duration-300 hover:bg-[#fbf9fe] sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#e7f6ef] text-[#137154] transition-transform duration-700 ease-out group-hover:scale-105">
                <UsersRound
                  className="size-5"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </span>
              <ArrowUpRight
                className="size-5 text-[#aaa1b2] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#137154]"
                aria-hidden="true"
              />
            </div>
            <h2 className="mt-12 font-['Manrope'] text-2xl font-bold tracking-[-0.035em] text-[#172235]">
              Hoạt động của Ban tổ chức
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#756c7e]">
              Quản lý danh sách organizer, số sự kiện phụ trách và hiệu quả vận
              hành theo từng đơn vị.
            </p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8194]">
              Sẽ bổ sung sau
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
