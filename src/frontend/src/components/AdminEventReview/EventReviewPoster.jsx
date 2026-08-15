import { Sparkles } from "lucide-react";

import { getBannerThemeClasses } from "../../utils/adminEventReviewUtils.js";

export default function EventReviewPoster({ event, compact = false }) {
  if (event.bannerUrl) {
    return (
      <img
        src={event.bannerUrl}
        alt={`Poster sự kiện ${event.title}`}
        className={`object-cover ${
          compact
            ? "size-11 rounded-xl"
            : "aspect-[4/5] min-h-[420px] w-full rounded-b-2xl"
        }`}
      />
    );
  }

  return (
    <div
      className={`group relative isolate overflow-hidden bg-gradient-to-br ${getBannerThemeClasses(event.bannerTheme)} ${
        compact ? "size-11 rounded-xl" : "aspect-[4/5] min-h-[420px] rounded-b-2xl"
      }`}
      aria-label={`Poster sự kiện ${event.title}`}
      role="img"
    >
      <div className="absolute -left-[15%] top-[18%] h-[72%] w-[42%] rotate-[26deg] rounded-[44%] bg-cyan-300/75 blur-[2px] transition-transform duration-700 ease-out group-hover:scale-105" />
      <div className="absolute left-[26%] top-[12%] h-[76%] w-[34%] -rotate-[24deg] rounded-[48%] bg-indigo-500/85 shadow-[0_0_55px_rgba(79,70,229,0.7)] transition-transform duration-700 ease-out group-hover:scale-105" />
      <div className="absolute right-[8%] top-[20%] h-[66%] w-[31%] rotate-[31deg] rounded-[46%] bg-fuchsia-500/75 blur-[1px] transition-transform duration-700 ease-out group-hover:scale-105" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.24),transparent_28%),linear-gradient(to_top,rgba(4,8,22,0.88),transparent_58%)]" />

      {!compact && (
        <div className="absolute inset-x-0 bottom-0 z-10 p-7 sm:p-8">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
            <Sparkles className="size-3" aria-hidden="true" />
            UniEvent Preview
          </span>
          <p className="mt-3 max-w-[290px] font-['Cabinet_Grotesk','Manrope',sans-serif] text-[clamp(1.55rem,3vw,2.25rem)] font-bold leading-[1.06] tracking-[-0.04em] text-white">
            {event.title}
          </p>
          <p className="mt-4 text-xs font-medium text-white/65">
            {event.category} · {event.id}
          </p>
        </div>
      )}
    </div>
  );
}
