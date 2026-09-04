import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import SignupShell from "../components/SignupShell";

const organizerHighlights = [
  "Tạo và quản lý sự kiện tập trung",
  "Theo dõi đăng ký theo thời gian thực",
  "Check-in nhanh chóng bằng mã QR",
  "Tiếp cận cộng đồng sinh viên phù hợp",
];

const OrganizerSignupCompletePage = () => {
  const [searchParams] = useSearchParams();
  const isApproved = searchParams.get("status") === "active";

  return (
    <SignupShell
      roleLabel="Tài khoản Ban tổ chức"
      roleIcon={Building2}
      title={isApproved ? "Tài khoản đã sẵn sàng" : "Hoàn tất xác minh email"}
      description={
        isApproved
          ? "Email và hồ sơ Ban tổ chức của bạn đều đã được xác nhận."
          : "Email đã được xác nhận thành công. Hồ sơ của bạn đang chờ quản trị viên xem xét."
      }
      visualTitle="Tổ chức bài bản. Kết nối đúng người."
      visualDescription="UniEvent đưa toàn bộ quy trình từ công bố, đăng ký đến check-in về một nền tảng duy nhất cho cộng đồng đại học."
      highlights={organizerHighlights}
      currentStep={3}
      showLoginFooter={false}
    >
      <section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-[0_24px_70px_-36px_rgba(76,29,149,0.35)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
            <CheckCircle2 className="size-10" aria-hidden="true" />
          </div>
          <h1 className="mt-6 font-manrope text-2xl font-bold tracking-[-0.025em] text-slate-950">
            {isApproved
              ? "Tài khoản đã được phê duyệt"
              : "Yêu cầu đăng ký đã hoàn tất"}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
            {isApproved
              ? "Bạn đã hoàn thành tất cả các bước và có thể sử dụng quyền Ban tổ chức."
              : "Cảm ơn bạn đã xác nhận email. Quản trị viên sẽ kiểm tra thông tin và tài liệu minh chứng trước khi cấp quyền tổ chức sự kiện."}
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-start gap-3 border-b border-slate-100 bg-emerald-50/50 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <MailCheck className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  Xác minh email
                </p>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <Check className="size-3.5" aria-hidden="true" />
                  Hoàn tất
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Địa chỉ email của bạn đã được xác nhận thành công.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white p-4">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                isApproved
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {isApproved ? (
                <ShieldCheck className="size-4.5" aria-hidden="true" />
              ) : (
                <Clock3 className="size-4.5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  Xét duyệt từ quản trị viên
                </p>
                <span
                  className={`text-xs font-semibold ${
                    isApproved ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isApproved ? "Đã phê duyệt" : "Đang chờ"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {isApproved
                  ? "Quyền tạo và quản lý sự kiện đã được mở cho tài khoản của bạn."
                  : "Vui lòng chờ quản trị viên hoàn tất việc kiểm tra hồ sơ. Bạn chưa cần thực hiện thêm thao tác nào."}
              </p>
            </div>
          </div>
        </div>

        {!isApproved && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-blue-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Bạn có thể đóng trang này
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Bạn có thể đăng nhập ngay để khám phá sự kiện. Quyền quản lý chỉ
                được mở sau khi quản trị viên phê duyệt hồ sơ.
              </p>
            </div>
          </div>
        )}

        <Link
          to="/auth/login"
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
        >
          Quay lại trang đăng nhập
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    </SignupShell>
  );
};

export default OrganizerSignupCompletePage;
