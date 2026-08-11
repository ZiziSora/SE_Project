import { Clock3 } from "lucide-react";

const REQUEST_TIME_ZONE = "Asia/Ho_Chi_Minh";

const REQUEST_DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: REQUEST_TIME_ZONE,
});

const REQUEST_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: REQUEST_TIME_ZONE,
});

export default function SubmittedTime({ value, compact = false }) {
  const submittedDate = new Date(value);
  const date = REQUEST_DATE_FORMATTER.format(submittedDate);
  const time = REQUEST_TIME_FORMATTER.format(submittedDate);

  if (compact) {
    return (
      <time dateTime={value} className="font-medium text-[#312a39]">
        {time}, {date}
      </time>
    );
  }

  return (
    <time dateTime={value} className="block whitespace-nowrap">
      <span className="block text-[13px] font-semibold text-[#403747]">{date}</span>
      <span className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[#8a8192]">
        <Clock3 className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
        {time}
      </span>
    </time>
  );
}
