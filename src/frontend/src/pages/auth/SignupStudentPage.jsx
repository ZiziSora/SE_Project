import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Info,
  Lock,
  Mail,
  MailCheck,
  RefreshCw,
  School,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { resendVerificationEmail, signupStudent } from "../api/authApi";
import InputField from "../components/InputField";
import SelectedField from "../components/SelectedField";
import SignupShell from "../components/SignupShell";
import { validateStudentEmail } from "../utils/validateStudentEmail";
import { savePendingVerification } from "../lib/pendingVerification";

const departmentOptions = [
  "Công nghệ Thông tin",
  "Hóa học",
  "Toán - Tin học",
  "Vật lý - Vật lý kỹ thuật",
  "Sinh học và công nghệ sinh học",
  "Môi trường",
  "Địa chất",
  "Khoa học và công nghệ vật liệu",
  "Điện tử viễn thông",
  "Khoa học liên ngành",
];

const studentHighlights = [
  "Khám phá hoạt động phù hợp với sở thích",
  "Đăng ký và nhận vé QR ngay trên hệ thống",
  "Theo dõi lịch sự kiện trong một nơi duy nhất",
  "Nhận gợi ý sự kiện dành riêng cho bạn",
];

const formatCooldown = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.message ||
  "Đã xảy ra lỗi. Vui lòng thử lại";

const SignupStudentPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submissionBlocked, setSubmissionBlocked] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    department_name: "",
    password: "",
  });

  useEffect(() => {
    if (!emailSent || resendCooldown <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [emailSent, resendCooldown]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.full_name ||
      !formData.email ||
      !formData.password ||
      !confirmPassword
    ) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
      return;
    }

    if (formData.password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    const validation = validateStudentEmail(formData.email);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    try {
      setLoading(true);
      const normalizedEmail = formData.email.trim().toLowerCase();
      const result = await signupStudent({
        ...formData,
        email: normalizedEmail,
      });

      savePendingVerification(result.verification_state);
      setRegisteredEmail(normalizedEmail);
      setEmailSent(true);
      localStorage.removeItem("role");
    } catch (error) {
      if (error.response?.status === 503) {
        setSubmissionBlocked(true);
      }
      toast.error(
        error.response?.data?.detail || "Đã xảy ra lỗi. Vui lòng thử lại",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendingEmail || resendCooldown > 0 || !registeredEmail) return;

    try {
      setResendingEmail(true);
      const result = await resendVerificationEmail(registeredEmail);
      savePendingVerification(result.verification_state);
      setResendCooldown(result.retry_after_seconds || 60);
      toast.success(result.message);
    } catch (error) {
      const retryAfter = Number(error.response?.headers?.["retry-after"]);
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        setResendCooldown(Math.ceil(retryAfter));
      }
      toast.error(getErrorMessage(error));
    } finally {
      setResendingEmail(false);
    }
  };

  if (emailSent) {
    return (
      <SignupShell
        roleLabel="Tài khoản sinh viên"
        roleIcon={GraduationCap}
        title="Kiểm tra hộp thư của bạn"
        description="Email xác nhận đã được gửi. Bạn chỉ còn một bước để bắt đầu khám phá UniEvent."
        visualTitle="Cánh cửa đến mọi trải nghiệm đại học."
        visualDescription="Từ workshop chuyên môn đến hoạt động cộng đồng, UniEvent giúp bạn tìm thấy những cơ hội đáng giá trong hành trình sinh viên."
        highlights={studentHighlights}
        currentStep={2}
        showLoginFooter={false}
      >
        <div className="rounded-2xl border border-violet-100 bg-white p-6 text-center shadow-[0_24px_70px_-36px_rgba(76,29,149,0.35)] sm:p-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <MailCheck className="size-8" aria-hidden="true" />
          </div>
          <h3 className="mt-5 font-manrope text-xl font-bold text-slate-950">
            Email xác nhận đang chờ bạn
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Chúng tôi đã gửi liên kết kích hoạt đến{" "}
            <span className="font-semibold text-violet-700">
              {registeredEmail}
            </span>
            . Hãy mở email và chọn liên kết xác nhận.
          </p>

          <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-left">
            <Info className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden="true" />
            <p className="text-xs leading-5 text-slate-600">
              Chưa thấy email? Hãy kiểm tra thư mục Spam hoặc Thư rác. Liên kết
              xác nhận có hiệu lực trong 24 giờ.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-700">
                Chưa nhận được email?
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Kiểm tra thư mục Spam trước khi gửi lại.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingEmail || resendCooldown > 0}
              className="mt-3 flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:mt-0 sm:w-auto"
            >
              <RefreshCw
                className={`size-4 ${resendingEmail ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {resendingEmail
                ? "Đang gửi..."
                : resendCooldown > 0
                  ? `Gửi lại sau ${formatCooldown(resendCooldown)}`
                  : "Gửi lại email"}
            </button>
            <span className="sr-only" aria-live="polite">
              {resendCooldown > 0
                ? `Có thể gửi lại email sau ${resendCooldown} giây`
                : "Có thể gửi lại email xác thực"}
            </span>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-left">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <p className="text-xs leading-5 text-emerald-800">
              Sau khi xác nhận email, bạn sẽ được chuyển đến trang hoàn tất để
              chủ động quay lại đăng nhập.
            </p>
          </div>
        </div>
      </SignupShell>
    );
  }

  return (
    <SignupShell
      roleLabel="Tài khoản sinh viên"
      roleIcon={GraduationCap}
      title="Bắt đầu hành trình của bạn"
      description="Tạo tài khoản bằng email sinh viên để khám phá, đăng ký và lưu lại những sự kiện bạn quan tâm."
      visualTitle="Cánh cửa đến mọi trải nghiệm đại học."
      visualDescription="Từ workshop chuyên môn đến hoạt động cộng đồng, UniEvent giúp bạn tìm thấy những cơ hội đáng giá trong hành trình sinh viên."
      highlights={studentHighlights}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Họ và tên *"
            id="student-fullname"
            placeholder="Nguyễn Văn A"
            icon={User}
            value={formData.full_name}
            onChange={(event) =>
              setFormData({ ...formData, full_name: event.target.value })
            }
            autoComplete="name"
            required
            variant="signup"
          />
          <InputField
            label="Email sinh viên *"
            id="student-email"
            placeholder="mssv@student.hcmus.edu.vn"
            icon={Mail}
            type="email"
            value={formData.email}
            onChange={(event) =>
              setFormData({ ...formData, email: event.target.value })
            }
            autoComplete="email"
            required
            variant="signup"
          />
          <div className="sm:col-span-2">
            <SelectedField
              label="Khoa đang theo học"
              id="student-department"
              icon={School}
              options={departmentOptions}
              value={formData.department_name}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  department_name: event.target.value,
                })
              }
              variant="signup"
            />
          </div>
          <InputField
            label="Mật khẩu *"
            id="student-password"
            placeholder="Ít nhất 6 ký tự"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(event) =>
              setFormData({ ...formData, password: event.target.value })
            }
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            autoComplete="new-password"
            minLength={6}
            required
            variant="signup"
          />
          <InputField
            label="Xác nhận mật khẩu *"
            id="student-confirm-password"
            placeholder="Nhập lại mật khẩu"
            icon={Lock}
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            showPassword={showConfirmPassword}
            setShowPassword={setShowConfirmPassword}
            autoComplete="new-password"
            minLength={6}
            required
            variant="signup"
          />
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden="true" />
          <p className="text-xs leading-5 text-slate-600">
            Sau khi đăng ký, UniEvent sẽ gửi một liên kết xác nhận đến email sinh
            viên của bạn.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || submissionBlocked}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Đang tạo tài khoản...
            </>
          ) : submissionBlocked ? (
            "Vui lòng thử lại sau"
          ) : (
            <>
              Tạo tài khoản sinh viên
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>

        <p className="text-center text-xs leading-5 text-slate-400">
          Bằng việc tiếp tục, bạn đồng ý sử dụng UniEvent cho mục đích học tập và
          hoạt động tại trường.
        </p>
      </form>
    </SignupShell>
  );
};

export default SignupStudentPage;
