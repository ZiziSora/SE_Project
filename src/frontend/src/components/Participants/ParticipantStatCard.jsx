import { formatNumber } from "../../utils/participantUtils.js";

const TONE_CLASSES = {
  violet: { box: "bg-accent text-primary", value: "text-primary" },
  teal: { box: "bg-teal-100 text-teal-600", value: "text-teal-600" },
  red: { box: "bg-red-100 text-red-500", value: "text-red-500" },
};

/** Thẻ số liệu ở đầu trang chi tiết người tham gia. */
export default function ParticipantStatCard({ label, value, icon: Icon, tone = "violet" }) {
  const toneClass = TONE_CLASSES[tone] ?? TONE_CLASSES.violet;

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-base font-semibold text-foreground">{label}</p>
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${toneClass.box}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-3 text-4xl font-bold leading-none ${toneClass.value}`}>
        {formatNumber(value)}
      </p>
    </article>
  );
}
