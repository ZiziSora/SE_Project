import {
  ArrowLeft,
  Check,
  GraduationCap,
  Sparkles,
  Telescope,
} from "lucide-react";
import { Link } from "react-router-dom";
import hcmus from "../assets/hcmus.png";

const SignupShell = ({
  children,
  roleLabel,
  roleIcon: RoleIcon,
  title,
  description,
  visualTitle,
  visualDescription,
  highlights,
  currentStep = 1,
  showLoginFooter = true,
}) => {
  const steps = ["Thông tin", "Xác nhận", "Hoàn tất"];

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-[#f8f9ff] lg:grid lg:grid-cols-12">
      <aside className="group relative hidden min-h-screen overflow-hidden bg-slate-950 lg:sticky lg:top-0 lg:col-span-5 lg:flex lg:h-screen lg:self-start lg:flex-col lg:justify-between">
        <img
          src={hcmus}
          alt="Khuôn viên Trường Đại học Khoa học Tự nhiên"
          className="signup-visual absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-1000 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.28)_0%,rgba(30,13,56,0.5)_42%,rgba(15,23,42,0.96)_100%)]" />
        <div className="absolute -left-28 top-1/3 size-80 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute -right-32 bottom-16 size-80 rounded-full bg-blue-400/20 blur-3xl" />

        <Link
          to="/auth/signup"
          className="signup-reveal relative z-10 m-8 flex w-fit items-center gap-3 text-white xl:m-12"
          aria-label="Quay lại chọn vai trò"
        >
          <span className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
            <Telescope className="size-5" aria-hidden="true" />
          </span>
          <span className="font-manrope text-xl font-bold tracking-tight">
            UniEvent
          </span>
        </Link>

        <div className="relative z-10 p-8 xl:p-12">
          <div className="signup-reveal signup-delay-1 mb-6 flex size-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-violet-100 backdrop-blur-md">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <h1 className="signup-reveal signup-delay-2 max-w-xl font-manrope text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-white xl:text-5xl">
            {visualTitle}
          </h1>
          <p className="signup-reveal signup-delay-3 mt-5 max-w-lg text-sm leading-6 text-slate-200 xl:text-base xl:leading-7">
            {visualDescription}
          </p>

          <ul className="signup-reveal signup-delay-4 mt-8 grid gap-3 border-t border-white/15 pt-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {highlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-2.5 text-sm leading-5 text-white/90"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-400/20 text-violet-200">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="relative min-h-screen overflow-hidden lg:col-span-7">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-violet-200/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 size-96 rounded-full bg-blue-100/70 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5 sm:px-8 sm:py-8 lg:justify-center lg:px-12 lg:py-12 xl:px-16">
          <div className="signup-reveal mb-8 flex items-center justify-between lg:hidden">
            <Link
              to="/auth/signup"
              className="flex items-center gap-2 text-slate-900"
              aria-label="Quay lại chọn vai trò"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200">
                <GraduationCap className="size-5" aria-hidden="true" />
              </span>
              <span className="font-manrope text-lg font-bold">UniEvent</span>
            </Link>
            <Link
              to="/auth/signup"
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Chọn vai trò
            </Link>
          </div>

          <div className="signup-reveal signup-delay-1 mb-7 flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100">
                <RoleIcon className="size-4" aria-hidden="true" />
              </span>
              {roleLabel}
            </span>

            <Link
              to="/auth/signup"
              className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:text-violet-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 lg:inline-flex"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Quay lại chọn vai trò
            </Link>
          </div>

          <div className="signup-reveal signup-delay-2 mb-8">
            <h2 className="max-w-xl font-manrope text-3xl font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl">
              {title}
            </h2>
            <p className="mt-2.5 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              {description}
            </p>
          </div>

          <div
            className="signup-reveal signup-delay-3 mb-8 grid grid-cols-3"
            aria-label={`Bước ${currentStep} trong 3`}
          >
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber <= currentStep;

              return (
                <div key={step} className="relative flex flex-col gap-2 pr-3">
                  <div
                    className={`h-1 rounded-full transition-colors ${
                      isActive ? "bg-violet-600" : "bg-slate-200"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold sm:text-sm ${
                      isActive ? "text-violet-700" : "text-slate-400"
                    }`}
                  >
                    {stepNumber}. {step}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="signup-reveal signup-delay-4">{children}</div>

          {showLoginFooter && (
            <p className="signup-reveal signup-delay-4 mt-7 text-center text-sm text-slate-500">
              Đã có tài khoản?{" "}
              <Link
                to="/auth/login"
                className="font-semibold text-violet-700 underline-offset-4 transition-colors hover:text-violet-900 hover:underline"
              >
                Đăng nhập
              </Link>
            </p>
          )}
        </div>
      </section>
    </main>
  );
};

export default SignupShell;
