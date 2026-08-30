import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  Info,
  LoaderCircle,
  Mail,
  Paperclip,
  School,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getOrganizerResubmission,
  resubmitOrganizer,
} from "../../api/authApi.js";
import OrganizerHeader from "../../components/common/OrganizerHeader.jsx";
import { prepareOrganizerProofFiles } from "../../utils/organizerProofs.js";

gsap.registerPlugin(useGSAP);

const departments = [
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

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.message ||
  "Đã xảy ra lỗi. Vui lòng thử lại.";

export default function OrganizerResubmitWorkspacePage() {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [retainedAttachments, setRetainedAttachments] = useState([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    department_name: "",
    reason: "",
  });

  const attachmentCount = retainedAttachments.length + selectedFiles.length;

  useEffect(() => {
    let cancelled = false;

    getOrganizerResubmission()
      .then((data) => {
        if (cancelled) return;
        setFormData({
          full_name: data.full_name,
          email: data.email,
          department_name: data.department_name,
          reason: data.request_reason || "",
        });
        setRejectionReason(data.rejection_reason);
        setRetainedAttachments(data.attachments);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(getErrorMessage(error));
        navigate("/organizer/status", { replace: true });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useGSAP(
    () => {
      if (isLoading || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      gsap.from(".rerequest-reveal", {
        y: 14,
        opacity: 0,
        duration: 0.55,
        stagger: 0.055,
        ease: "power3.out",
      });
    },
    { scope: pageRef, dependencies: [isLoading], revertOnUpdate: true },
  );

  const handleNewFiles = (event) => {
    const incoming = Array.from(event.target.files || []);

    if (attachmentCount + incoming.length > 5) {
      toast.error("Mỗi hồ sơ được gửi tối đa 5 tài liệu minh chứng.");
    } else {
      setSelectedFiles((files) => [...files, ...incoming]);
    }

    event.target.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const fullName = formData.full_name.trim();
    const reason = formData.reason.trim();

    if (!fullName || !reason) {
      toast.error("Vui lòng nhập đầy đủ tên đơn vị và lý do đăng ký.");
      return;
    }

    try {
      setIsSubmitting(true);
      const proofFiles = await prepareOrganizerProofFiles(
        selectedFiles,
        retainedAttachments.length,
      );
      const result = await resubmitOrganizer({
        full_name: fullName,
        department_name: formData.department_name.trim(),
        reason,
        proof_urls: retainedAttachments.map((item) => item.url),
        proof_files: proofFiles,
      });

      toast.success(result.message);
      if (result.warning) toast.warning(result.warning);
      localStorage.setItem("account_status", "pending");
      localStorage.setItem("can_manage_events", "false");
      navigate("/organizer/status", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] text-slate-900">
        <OrganizerHeader />
        <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="animate-pulse space-y-5" aria-label="Đang tải hồ sơ">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="h-10 max-w-lg rounded-xl bg-slate-200" />
            <div className="h-24 rounded-2xl bg-red-100/70" />
            <div className="h-[32rem] rounded-3xl bg-white ring-1 ring-slate-200" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="min-h-screen bg-[#f8f9ff] text-slate-900">
      <OrganizerHeader />

      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="rerequest-reveal">
          <Link
            to="/organizer/status"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors duration-300 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600"
          >
            <ArrowLeft
              className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            Quay lại trạng thái tài khoản
          </Link>
        </div>

        <header className="rerequest-reveal mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <h1 className="max-w-4xl font-manrope text-[clamp(2rem,4vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.045em] text-slate-950">
              Chỉnh sửa và nộp lại hồ sơ Organizer
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Thông tin từ lần nộp trước đã được điền sẵn. Hãy xử lý phản hồi
              của Admin, kiểm tra lại tài liệu rồi gửi một yêu cầu xét duyệt mới.
            </p>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200">
            <span className="size-2 rounded-full bg-red-500" aria-hidden="true" />
            Cần chỉnh sửa
          </span>
        </header>

        <section className="rerequest-reveal mt-8 overflow-hidden rounded-2xl bg-red-50 ring-1 ring-red-200" aria-labelledby="admin-feedback-heading">
          <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700">
              <AlertTriangle className="size-5" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="admin-feedback-heading" className="text-sm font-bold text-red-950">
                Lý do Admin từ chối hồ sơ trước
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-900/85">
                {rejectionReason || "Admin không cung cấp lý do cụ thể."}
              </p>
            </div>
          </div>
          <div className="border-t border-red-200/80 bg-white/45 px-5 py-3 text-xs leading-5 text-red-800 sm:px-6">
            Nội dung này chỉ là phản hồi của Admin, không thay thế phần lý do
            đăng ký do bạn cung cấp bên dưới.
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rerequest-reveal mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_-48px_rgba(76,29,149,0.3)] ring-1 ring-slate-200"
        >
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
                <FileText className="size-5" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-manrope text-lg font-bold tracking-[-0.02em] text-slate-950">
                  Thông tin cần chỉnh sửa
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Chỉ cập nhật những phần chưa chính xác hoặc chưa đủ rõ ràng.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-flow-dense grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
              <label className="block" htmlFor="organizer-name">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserRound className="size-4 text-slate-400" strokeWidth={1.7} aria-hidden="true" />
                  Tên đơn vị hoặc người đại diện
                </span>
                <input
                  id="organizer-name"
                  value={formData.full_name}
                  onChange={(event) =>
                    setFormData({ ...formData, full_name: event.target.value })
                  }
                  autoComplete="organization"
                  required
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-slate-400 hover:border-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <div className="grid grid-flow-dense gap-5 sm:grid-cols-2">
                <label className="block" htmlFor="organizer-email">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Mail className="size-4 text-slate-400" strokeWidth={1.7} aria-hidden="true" />
                    Email đăng nhập
                  </span>
                  <input
                    id="organizer-email"
                    value={formData.email}
                    disabled
                    className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm text-slate-500"
                  />
                  <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                    Email và tài khoản hiện tại được giữ nguyên.
                  </span>
                </label>

                <label className="block" htmlFor="organizer-department">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <School className="size-4 text-slate-400" strokeWidth={1.7} aria-hidden="true" />
                    Khoa hoặc đơn vị
                  </span>
                  <select
                    id="organizer-department"
                    value={formData.department_name}
                    onChange={(event) =>
                      setFormData({ ...formData, department_name: event.target.value })
                    }
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-300 hover:border-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  >
                    <option value="">Chọn đơn vị</option>
                    {departments.map((department) => (
                      <option key={department}>{department}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block" htmlFor="organizer-reason">
                <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-2">
                    <FileText className="size-4 text-slate-400" strokeWidth={1.7} aria-hidden="true" />
                    Lý do đăng ký từ Organizer
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {formData.reason.length}/2000
                  </span>
                </span>
                <textarea
                  id="organizer-reason"
                  rows={8}
                  maxLength={2000}
                  value={formData.reason}
                  onChange={(event) =>
                    setFormData({ ...formData, reason: event.target.value })
                  }
                  required
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-slate-400 hover:border-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
                <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                  Nêu rõ vai trò của đơn vị, nhu cầu tổ chức sự kiện và những
                  nội dung bạn đã cập nhật sau phản hồi của Admin.
                </span>
              </label>

              <div className="flex items-start gap-3 rounded-xl bg-violet-50 px-4 py-3.5 text-violet-900 ring-1 ring-violet-100">
                <Info className="mt-0.5 size-4 shrink-0 text-violet-600" strokeWidth={1.7} aria-hidden="true" />
                <p className="text-xs leading-5">
                  Dữ liệu trên được lấy từ request gần nhất. Việc chỉnh sửa
                  không làm thay đổi request cũ trong lịch sử xét duyệt.
                </p>
              </div>
            </section>

            <aside className="border-t border-slate-200 bg-slate-50/75 px-5 py-6 sm:px-7 lg:border-l lg:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tài liệu minh chứng
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    PDF, Word hoặc hình ảnh; tối đa 5MB mỗi tệp.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                  {attachmentCount}/5
                </span>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group mt-5 flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-violet-300 bg-white px-4 py-5 text-center transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-violet-500 hover:bg-violet-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 active:translate-y-0"
              >
                <UploadCloud
                  className="size-6 text-violet-600 transition-transform duration-300 group-hover:-translate-y-0.5"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
                <span className="mt-2 text-sm font-bold text-violet-700">
                  Thêm tài liệu
                </span>
                <span className="mt-0.5 text-xs text-slate-500">
                  Còn {Math.max(0, 5 - attachmentCount)} vị trí
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx"
                onChange={handleNewFiles}
                className="hidden"
              />

              <div className="mt-5 space-y-2">
                {attachmentCount === 0 && (
                  <div className="rounded-xl bg-white px-4 py-5 text-center ring-1 ring-slate-200">
                    <Paperclip className="mx-auto size-5 text-slate-400" strokeWidth={1.7} aria-hidden="true" />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Chưa có tài liệu minh chứng.
                    </p>
                  </div>
                )}

                {retainedAttachments.map((attachment) => (
                  <div
                    key={attachment.attachment_id}
                    className="flex items-center gap-2.5 rounded-xl bg-white p-2 pl-3 ring-1 ring-slate-200"
                  >
                    <Paperclip className="size-4 shrink-0 text-slate-400" strokeWidth={1.7} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-xs font-semibold text-slate-700 transition-colors duration-300 hover:text-violet-700"
                      >
                        {attachment.file_name}
                      </a>
                      <span className="text-[11px] text-slate-400">Từ lần nộp trước</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setRetainedAttachments((items) =>
                          items.filter(
                            (item) => item.attachment_id !== attachment.attachment_id,
                          ),
                        )
                      }
                      aria-label={`Bỏ tệp ${attachment.file_name}`}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors duration-300 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500"
                    >
                      <Trash2 className="size-4" strokeWidth={1.7} aria-hidden="true" />
                    </button>
                  </div>
                ))}

                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-2 pl-3 ring-1 ring-emerald-200"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" strokeWidth={1.7} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-emerald-900">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-emerald-700">Tệp mới</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((files) =>
                          files.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      aria-label={`Bỏ tệp ${file.name}`}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-emerald-700 transition-colors duration-300 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500"
                    >
                      <Trash2 className="size-4" strokeWidth={1.7} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="border-t border-slate-200 bg-white px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <details className="group max-w-xl">
                <summary className="flex w-fit list-none items-center gap-2 text-sm font-semibold text-slate-600 transition-colors duration-300 hover:text-violet-700 [&::-webkit-details-marker]:hidden">
                  <ShieldCheck className="size-4" strokeWidth={1.7} aria-hidden="true" />
                  Điều gì xảy ra sau khi gửi?
                  <ChevronDown className="size-4 transition-transform duration-300 group-open:rotate-180" strokeWidth={1.7} aria-hidden="true" />
                </summary>
                <p className="mt-2 pl-6 text-xs leading-5 text-slate-500">
                  Hệ thống tạo một request PENDING mới, liên kết với request
                  trước và chuyển trạng thái tài khoản về PENDING. Bạn vẫn đăng
                  nhập được nhưng chưa thể quản lý sự kiện cho đến khi được duyệt.
                </p>
              </details>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white shadow-[0_12px_28px_-14px_rgba(109,40,217,0.7)] transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-violet-800 hover:shadow-[0_16px_32px_-14px_rgba(109,40,217,0.8)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 active:translate-y-0 disabled:cursor-wait disabled:opacity-65 lg:w-auto"
              >
                {isSubmitting ? (
                  <LoaderCircle className="size-4 animate-spin" strokeWidth={1.7} aria-hidden="true" />
                ) : (
                  <Send className="size-4" strokeWidth={1.7} aria-hidden="true" />
                )}
                {isSubmitting ? "Đang gửi hồ sơ..." : "Gửi hồ sơ xét duyệt lại"}
                {!isSubmitting && (
                  <ArrowRight
                    className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
