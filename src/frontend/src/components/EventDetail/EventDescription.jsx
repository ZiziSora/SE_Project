import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

export function EventDescription({ text }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canCollapse = text.length > 320 || text.split("\n").length > 5;

  return (
    <section>
      {/* Section heading */}
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-violet-100">
          <FileText size={17} className="text-violet-700" strokeWidth={2} aria-hidden="true" />
        </div>
        <h2 className="font-manrope text-xl font-bold tracking-[-0.025em] text-[#21182c]">
          Mô tả chi tiết
        </h2>
      </div>

      {/* Text body */}
      <div
        className={`relative ${canCollapse && !isExpanded ? "max-h-48 overflow-hidden" : ""}`}
      >
        <p className="whitespace-pre-line break-words font-inter text-[0.9375rem] leading-7 text-slate-600">
          {text}
        </p>

        {/* Gradient fade when collapsed */}
        {canCollapse && !isExpanded && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent"
          />
        )}
      </div>

      {/* Toggle button */}
      {canCollapse && (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
        >
          {isExpanded ? (
            <>
              Thu gọn
              <ChevronUp className="size-4" />
            </>
          ) : (
            <>
              Xem thêm nội dung
              <ChevronDown className="size-4" />
            </>
          )}
        </button>
      )}
    </section>
  );
}

export default EventDescription;
