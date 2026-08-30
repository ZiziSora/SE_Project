import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Compass,
  ShieldAlert,
  SquarePen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { getOrganizerResubmission } from "../../api/authApi.js";
import OrganizerHeader from "../../components/common/OrganizerHeader.jsx";

export default function OrganizerAccountStatusPage() {
  const role = localStorage.getItem("role");
  const accountStatus = localStorage.getItem("account_status");
  const canManageEvents =
    localStorage.getItem("can_manage_events") === "true";
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoadingReason, setIsLoadingReason] = useState(
    accountStatus === "rejected",
  );

  useEffect(() => {
    if (accountStatus !== "rejected") return undefined;

    let cancelled = false;
    getOrganizerResubmission()
      .then((data) => {
        if (!cancelled) setRejectionReason(data.rejection_reason);
      })
      .catch(() => {
        if (!cancelled) {
          setRejectionReason("Không thể tải lý do từ chối lúc này.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReason(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountStatus]);

  if (role !== "organizer") {
    return <Navigate to="/explore" replace />;
  }

  if (canManageEvents) {
    return <Navigate to="/organizer" replace />;
  }

  const isRejected = accountStatus === "rejected";
  const StatusIcon = isRejected ? ShieldAlert : Clock3;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900">
      <OrganizerHeader />
      <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_80px_-48px_rgba(76,29,149,0.45)]">
          <div
            className={`border-b px-6 py-7 sm:px-9 ${
              isRejected
                ? "border-red-100 bg-red-50"
                : "border-amber-100 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-4">
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
                  isRejected
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <StatusIcon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Trạng thái tài khoản Ban tổ chức
                </p>
                <h1 className="mt-2 font-manrope text-2xl font-bold tracking-tight sm:text-3xl">
                  {isRejected
                    ? "Hồ sơ cần được chỉnh sửa"
                    : "Hồ sơ đang chờ xét duyệt"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Bạn đã đăng nhập thành công và vẫn có thể khám phá các sự
                  kiện. Các chức năng tạo, chỉnh sửa sự kiện, check-in và quản
                  lý người tham gia chỉ được mở sau khi hồ sơ được duyệt.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-7 sm:px-9 sm:py-9">
            {isRejected ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
                  <div>
                    <h2 className="text-sm font-bold text-red-900">
                      Lý do từ chối
                    </h2>
                    <p className="mt-1.5 text-sm leading-6 text-red-800">
                      {isLoadingReason
                        ? "Đang tải lý do từ chối..."
                        : rejectionReason || "Không có lý do cụ thể."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                <p className="text-sm leading-6 text-emerald-800">
                  Yêu cầu của bạn đã được ghi nhận. Bạn không cần tạo tài khoản
                  hoặc gửi thêm hồ sơ trong thời gian chờ xét duyệt.
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to="/explore"
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-5 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                <Compass className="size-4" aria-hidden="true" />
                Khám phá sự kiện
              </Link>
              {isRejected && (
                <Link
                  to="/auth/organizer/resubmit"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800"
                >
                  <SquarePen className="size-4" aria-hidden="true" />
                  Chỉnh sửa &amp; nộp lại
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
