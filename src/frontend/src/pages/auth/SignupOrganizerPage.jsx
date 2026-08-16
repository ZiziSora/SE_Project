import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Info,
  Lock,
  Mail,
  MailCheck,
  RefreshCw,
  School,
  ShieldCheck,
  SquarePen,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { resendVerificationEmail, signupOrganizer } from "../../api/authApi";
import InputField from "../../components/InputField";
import SelectedField from "../../components/SelectedField";
import SignupShell from "../../components/SignupShell";
import UploadField from "../../components/UploadField";
import { savePendingVerification } from "../../lib/pendingVerification";

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

const organizerHighlights = [
  "Tạo và quản lý sự kiện tập trung",
  "Theo dõi đăng ký theo thời gian thực",
  "Check-in nhanh chóng bằng mã QR",
  "Tiếp cận cộng đồng sinh viên phù hợp",
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxProofFiles = 5;
const maxProofFileBytes = 5 * 1024 * 1024;
const proofContentTypes = new Map([
  ["application/pdf", "application/pdf"],
  ["application/msword", "application/msword"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ["image/jpeg", "image/jpeg"],
  ["image/png", "image/png"],
  ["image/webp", "image/webp"],
  ["image/gif", "image/gif"],
]);
const proofExtensionTypes = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  [
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
]);

const getProofContentType = (file) => {
  if (proofContentTypes.has(file.type)) return proofContentTypes.get(file.type);

  const extension = file.name.split(".").pop()?.toLowerCase();
  return proofExtensionTypes.get(extension);
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const contentBase64 = result.split(",", 2)[1];

      if (!contentBase64) {
        reject(new Error(`Không thể đọc tệp '${file.name}'.`));
        return;
      }
      resolve(contentBase64);
    };
    reader.onerror = () => reject(new Error(`Không thể đọc tệp '${file.name}'.`));
    reader.readAsDataURL(file);
  });

const prepareProofFiles = async (files) => {
  if (files.length > maxProofFiles) {
    throw new Error(`Chỉ được tải tối đa ${maxProofFiles} tệp minh chứng.`);
  }

  return Promise.all(
    files.map(async (file) => {
      const contentType = getProofContentType(file);
      if (!contentType) {
        throw new Error(
          `Tệp '${file.name}' không đúng định dạng PDF, Word hoặc hình ảnh.`,
        );
      }
      if (file.size === 0) {
        throw new Error(`Tệp '${file.name}' không có nội dung.`);
      }
      if (file.size > maxProofFileBytes) {
        throw new Error(`Tệp '${file.name}' vượt quá giới hạn 5MB.`);
      }

      return {
        filename: file.name,
        content_type: contentType,
        content_base64: await readFileAsBase64(file),
      };
    }),
  );
};

const getErrorMessage = (error) => {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item?.msg).filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }
  if (typeof error?.message === "string" && error.message) {
    return error.message;
  }

  return "Đã xảy ra lỗi. Vui lòng thử lại";
};

const formatCooldown = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const SignupOrganizerPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [submissionWarning, setSubmissionWarning] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "organizer",
    password: "",
    department_name: "",
    reason: "",
  });

  useEffect(() => {
    if (!requestSubmitted || resendCooldown <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [requestSubmitted, resendCooldown]);
  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedData = {
      ...formData,
      full_name: formData.full_name.trim(),
      email: formData.email.trim().toLowerCase(),
      reason: formData.reason.trim(),
    };

    if (
      !normalizedData.full_name ||
      !normalizedData.email ||
      !normalizedData.password ||
      !confirmPassword ||
      !normalizedData.reason
    ) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
      return;
    }

    if (!emailPattern.test(normalizedData.email)) {
      toast.error("Email không đúng định dạng");
      return;
    }

    if (normalizedData.password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (normalizedData.password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);
      const proofFiles = await prepareProofFiles(selectedFiles);
      const payload = {
        ...normalizedData,
        proof_urls: [],
        proof_files: proofFiles,
      };

      const result = await signupOrganizer(payload);
      savePendingVerification(result.verification_state);
      setRegisteredEmail(normalizedData.email);
      setSubmissionWarning(result.warning || "");
      setRequestSubmitted(true);
      toast.success("Đã gửi yêu cầu đăng ký Ban tổ chức");
      localStorage.removeItem("role");
    } catch (error) {
      toast.error(getErrorMessage(error));
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

  if (requestSubmitted) {
    return (
      <SignupShell
        roleLabel="Tài khoản Ban tổ chức"
        roleIcon={Building2}
        title="Yêu cầu đã được gửi"
        description="Hồ sơ của bạn đã được ghi nhận. Hoàn tất xác minh email và chờ quản trị viên xét duyệt để bắt đầu tạo sự kiện."
        visualTitle="Tổ chức bài bản. Kết nối đúng người."
        visualDescription="UniEvent đưa toàn bộ quy trình từ công bố, đăng ký đến check-in về một nền tảng duy nhất cho cộng đồng đại học."
        highlights={organizerHighlights}
        currentStep={2}
        showLoginFooter={false}
      >
        <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-[0_24px_70px_-36px_rgba(76,29,149,0.35)] sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <MailCheck className="size-7" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-manrope text-xl font-bold text-slate-950">
                Kiểm tra email xác nhận
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                Liên kết kích hoạt đã được gửi đến{" "}
                <span className="font-semibold text-violet-700">
                  {registeredEmail}
                </span>
                .
              </p>
            </div>
          </div>

          <ol className="mt-7 space-y-4 border-t border-slate-100 pt-6">
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-700 text-xs font-bold text-white">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Xác minh địa chỉ email
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  Mở email từ UniEvent và chọn liên kết xác nhận. Nếu chưa thấy,
                  hãy kiểm tra thư mục Spam.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Chờ quản trị viên xét duyệt
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  Sau khi hồ sơ được duyệt, bạn có thể đăng nhập và sử dụng quyền
                  quản lý sự kiện.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
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

          {submissionWarning && (
            <div className="mt-7 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Info
                className="mt-0.5 size-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <p className="text-xs leading-5 text-amber-800">
                {submissionWarning}
              </p>
            </div>
          )}

          <div className={`${submissionWarning ? "mt-4" : "mt-7"} flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4`}>
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <p className="text-xs leading-5 text-emerald-800">
              Bạn không cần gửi lại hồ sơ. Trạng thái xét duyệt được lưu trên hệ
              thống ngay cả khi chưa xác minh email.
            </p>
          </div>

          <Link
            to="/auth/login"
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-5 text-sm font-semibold text-violet-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
          >
            Quay về trang đăng nhập
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </SignupShell>
    );
  }

  return (
    <SignupShell
      roleLabel="Tài khoản Ban tổ chức"
      roleIcon={Building2}
      title="Biến ý tưởng thành sự kiện"
      description="Hoàn thiện thông tin dưới đây để gửi yêu cầu quyền Ban tổ chức. Quản trị viên sẽ xem xét hồ sơ của bạn."
      visualTitle="Tổ chức bài bản. Kết nối đúng người."
      visualDescription="UniEvent đưa toàn bộ quy trình từ công bố, đăng ký đến check-in về một nền tảng duy nhất cho cộng đồng đại học."
      highlights={organizerHighlights}
    >
      <form className="space-y-7" onSubmit={handleSubmit} noValidate>
        <section className="space-y-4" aria-labelledby="account-information">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h3
                id="account-information"
                className="font-manrope text-base font-bold text-slate-900"
              >
                Thông tin tài khoản
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Thông tin dùng để đăng nhập và liên hệ
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              * Bắt buộc
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Họ và tên *"
              id="organizer-fullname"
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
              label="Email liên hệ *"
              id="organizer-email"
              placeholder="email@hcmus.edu.vn"
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
                label="Khoa hoặc đơn vị"
                id="organizer-department"
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
              id="organizer-password"
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
              id="organizer-confirm-password"
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
        </section>

        <section className="space-y-4" aria-labelledby="verification-information">
          <div className="border-b border-slate-200 pb-3">
            <h3
              id="verification-information"
              className="font-manrope text-base font-bold text-slate-900"
            >
              Xác minh đơn vị
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Giúp quản trị viên xét duyệt hồ sơ nhanh hơn
            </p>
          </div>

          <InputField
            label="Lý do đăng ký *"
            id="organizer-reason"
            placeholder="Giới thiệu ngắn về đơn vị và loại sự kiện bạn dự định tổ chức..."
            icon={SquarePen}
            multiline
            rows={3}
            value={formData.reason}
            onChange={(event) =>
              setFormData({ ...formData, reason: event.target.value })
            }
            required
            variant="signup"
          />

          <UploadField
            label="Tài liệu minh chứng (không bắt buộc)"
            onFilesChange={setSelectedFiles}
          />

          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-blue-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Hồ sơ được xét duyệt thủ công
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Tài liệu có tên đơn vị, quyết định thành lập hoặc giấy xác nhận sẽ
                giúp quá trình xét duyệt thuận lợi hơn.
              </p>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Đang gửi yêu cầu...
            </>
          ) : (
            <>
              Gửi yêu cầu xét duyệt
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>

        <div className="flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-400">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Quyền tạo sự kiện được mở sau khi hồ sơ của bạn được phê duyệt.
        </div>
      </form>
    </SignupShell>
  );
};

export default SignupOrganizerPage;
