import {
  ArrowRight,
  Check,
  CheckCircle2,
  GraduationCap,
  MailCheck,
  PartyPopper,
} from "lucide-react";
import { Link } from "react-router-dom";
import SignupShell from "../components/SignupShell";

const studentHighlights = [
  "Khám phá hoạt động phù hợp với sở thích",
  "Đăng ký và nhận vé QR ngay trên hệ thống",
  "Theo dõi lịch sự kiện trong một nơi duy nhất",
  "Nhận gợi ý sự kiện dành riêng cho bạn",
];

const StudentSignupCompletePage = () => (
  <SignupShell
    roleLabel="Tài khoản sinh viên"
    roleIcon={GraduationCap}
    title="Tài khoản của bạn đã sẵn sàng"
    description="Email đã được xác nhận thành công. Bạn có thể đăng nhập và bắt đầu khám phá các hoạt động tại UniEvent."
    visualTitle="Cánh cửa đến mọi trải nghiệm đại học."
    visualDescription="Từ workshop chuyên môn đến hoạt động cộng đồng, UniEvent giúp bạn tìm thấy những cơ hội đáng giá trong hành trình sinh viên."
    highlights={studentHighlights}
    currentStep={3}
    showLoginFooter={false}
  >
    <section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-[0_24px_70px_-36px_rgba(76,29,149,0.35)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
          <CheckCircle2 className="size-10" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-manrope text-2xl font-bold tracking-[-0.025em] text-slate-950">
          Hoàn tất đăng ký sinh viên
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Tài khoản đã được kích hoạt. Từ bây giờ, bạn có thể đăng nhập để tìm
          kiếm, đăng ký và theo dõi các sự kiện mình quan tâm.
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
              Địa chỉ email sinh viên của bạn đã được xác nhận.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-white p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <PartyPopper className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">
                Kích hoạt tài khoản
              </p>
              <span className="text-xs font-semibold text-violet-700">
                Sẵn sàng
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Bạn đã có thể sử dụng tài khoản sinh viên trên UniEvent.
            </p>
          </div>
        </div>
      </div>

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

export default StudentSignupCompletePage;
