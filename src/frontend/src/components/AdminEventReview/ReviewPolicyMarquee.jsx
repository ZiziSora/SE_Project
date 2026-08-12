import { CheckCircle2 } from "lucide-react";

const ITEMS = [
  "Đối chiếu thời gian",
  "Kiểm tra sức chứa",
  "Xác minh kế hoạch",
  "Rà soát nội dung",
  "Phản hồi minh bạch",
];

export default function ReviewPolicyMarquee() {
  return (
    <div className="overflow-hidden border-y border-[#e3ddeb] bg-white/70 py-3.5" aria-label="Quy trình kiểm duyệt sự kiện">
      <div className="admin-review-marquee flex w-max items-center motion-reduce:translate-x-0">
        {[...ITEMS, ...ITEMS].map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="mx-7 inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-[#6b6275]"
          >
            <CheckCircle2 className="size-3.5 text-[#7c3aed]" strokeWidth={2} aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
