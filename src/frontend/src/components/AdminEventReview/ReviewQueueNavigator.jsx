import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ReviewQueueNavigator({ previousEvent, nextEvent }) {
  return (
    <section className="rounded-2xl border border-[#ded7e7] bg-white p-5 shadow-[0_14px_38px_rgba(44,29,59,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-['Cabinet_Grotesk','Manrope',sans-serif] text-base font-bold tracking-[-0.025em] text-[#172235]">
            Hàng chờ kế tiếp
          </h2>
          <p className="mt-1 text-xs text-[#8a8192]">
            Chuyển nhanh giữa các hồ sơ đang chờ.
          </p>
        </div>
        <div className="flex gap-2">
          {previousEvent ? (
            <Link
              to={`/admin/events/${previousEvent.id}`}
              aria-label={`Xem ${previousEvent.title}`}
              className="grid size-9 place-items-center rounded-full border border-[#ddd5e7] text-[#625a6c] transition-all hover:border-[#bda8d6] hover:bg-[#f5f0fb] hover:text-[#6d20df]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="grid size-9 place-items-center rounded-full border border-[#e9e4ed] text-[#c2bbc7]">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </span>
          )}
          {nextEvent ? (
            <Link
              to={`/admin/events/${nextEvent.id}`}
              aria-label={`Xem ${nextEvent.title}`}
              className="grid size-9 place-items-center rounded-full border border-[#ddd5e7] text-[#625a6c] transition-all hover:border-[#bda8d6] hover:bg-[#f5f0fb] hover:text-[#6d20df]"
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="grid size-9 place-items-center rounded-full border border-[#e9e4ed] text-[#c2bbc7]">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>
      <p className="mt-4 line-clamp-2 border-t border-[#eee9f1] pt-4 text-sm font-semibold leading-5 text-[#453d4e]">
        {nextEvent?.title ?? previousEvent?.title ?? "Không còn hồ sơ nào trong hàng chờ"}
      </p>
    </section>
  );
}
