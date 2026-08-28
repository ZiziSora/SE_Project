import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function EventDescription({ text }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canCollapse = text.length > 320 || text.split("\n").length > 5;

  return (
    <section>
      <h2 className="text-2xl font-manrope font-semibold tracking-[-0.03em] text-[#21182c]">
        Mô tả chi tiết
      </h2>
      <p
        className={`mt-4 whitespace-pre-line break-words font-inter text-base leading-7 text-slate-600 ${
          canCollapse && !isExpanded ? "line-clamp-5" : ""
        }`}
      >
        {text}
      </p>
      {canCollapse && (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 transition hover:text-violet-900"
        >
          {isExpanded ? "Thu gọn" : "Xem thêm"}
          {isExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      )}
    </section>
  );
}

export default EventDescription;
