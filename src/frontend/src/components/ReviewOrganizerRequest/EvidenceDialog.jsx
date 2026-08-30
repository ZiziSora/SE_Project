import { ChevronRight, FileCheck2, FileText, X } from "lucide-react";
import SubmittedTime from "./SubmittedTime.jsx";

export default function EvidenceDialog({ request, onClose }) {
  if (!request) return null;

  return (
    <div
      className="review-backdrop fixed inset-0 z-50 grid place-items-center bg-[#111827]/50 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-title"
        className="review-dialog max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/60 bg-white p-6 shadow-[0_32px_90px_rgba(20,12,30,0.28)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[#eee7ff] text-[#6d20df]">
              <FileCheck2 className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold text-[#776d80]">Hồ sơ xác minh</p>
              <h2
                id="evidence-title"
                className="mt-0.5 font-['Manrope'] text-xl font-bold tracking-[-0.02em] text-[#172235]"
              >
                {request.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid size-9 place-items-center rounded-full text-[#756c7e] transition-colors hover:bg-[#f4f0f7] hover:text-[#4c4355]"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-6 divide-y divide-[#e9e4ed] rounded-2xl border border-[#e4dee9] bg-[#fbfaff] px-5">
          <div className="py-4">
            <dt className="text-xs font-semibold text-[#82778c]">Đơn vị đại diện</dt>
            <dd className="mt-1.5 text-sm font-medium text-[#312a39]">{request.organization}</dd>
          </div>
          <div className="py-4">
            <dt className="text-xs font-semibold text-[#82778c]">Lý do đăng ký</dt>
            <dd className="mt-1.5 text-sm leading-6 text-[#5e5667]">{request.reason}</dd>
          </div>
          {request.rejectedReason && (
            <div className="py-4">
              <dt className="text-xs font-semibold text-red-700">
                Lý do từ chối
              </dt>
              <dd className="mt-1.5 text-sm leading-6 text-red-700">
                {request.rejectedReason}
              </dd>
            </div>
          )}
          <div className="py-4">
            <dt className="text-xs font-semibold text-[#82778c]">Thời gian gửi yêu cầu</dt>
            <dd className="mt-1.5 text-sm">
              <SubmittedTime value={request.submittedAt} compact />
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[#312a39]">
            Tệp đính kèm <span className="text-[#8a8192]">({request.evidence.length})</span>
          </h3>
          <div className="mt-3 space-y-2.5">
            {request.evidence.length === 0 && (
              <p className="rounded-xl border border-dashed border-[#d8d0df] bg-[#fbfaff] px-4 py-5 text-center text-sm text-[#7a7183]">
                Yêu cầu này không có tệp đính kèm.
              </p>
            )}
            {request.evidence.map((file) => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="group flex w-full items-center gap-3 rounded-xl border border-[#e1dae7] bg-white px-3.5 py-3 text-left text-[#51485d] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bca9d4] hover:shadow-[0_8px_22px_rgba(61,39,83,0.07)]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#f0e9ff] text-[#6d20df] transition-transform duration-500 ease-out group-hover:scale-105">
                  <FileText className="size-[17px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 truncate text-sm font-medium">{file.name}</span>
                <ChevronRight className="ml-auto size-4 text-[#aaa1b2] group-hover:text-[#6d20df]" />
              </a>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 h-11 w-full rounded-xl bg-[#1e293b] px-4 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#111827]"
        >
          Hoàn tất xem hồ sơ
        </button>
      </section>
    </div>
  );
}
