import {
  AlertTriangle,
  ArrowRight,
  Building2,
  FileText,
  Mail,
  School,
  SquarePen,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getOrganizerResubmission,
  resubmitOrganizer,
} from "../../api/authApi.js";
import InputField from "../../components/InputField.jsx";
import SelectedField from "../../components/SelectedField.jsx";
import SignupShell from "../../components/SignupShell.jsx";
import UploadField from "../../components/UploadField.jsx";
import { prepareOrganizerProofFiles } from "../../utils/organizerProofs.js";

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
  "Giữ nguyên tài khoản và email hiện tại",
  "Chỉnh sửa thông tin hồ sơ",
  "Thay thế tài liệu minh chứng",
  "Lưu lịch sử từng lần nộp",
];

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.message ||
  "Đã xảy ra lỗi. Vui lòng thử lại.";

export default function OrganizerResubmissionPage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    let cancelled = false;

    getOrganizerResubmission()
      .then((data) => {
        if (cancelled) return;
        setFormData({
          full_name: data.full_name,
          email: data.email,
          department_name: data.department_name,
          reason: "",
        });
        setRejectionReason(data.rejection_reason);
        setRetainedAttachments(data.attachments);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(getErrorMessage(error));
        navigate("/auth/login", { replace: true });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const fullName = formData.full_name.trim();
    const reason = formData.reason.trim();

    if (!fullName || !reason) {
      toast.error("Vui lòng nhập đầy đủ tên đơn vị và nội dung hồ sơ mới.");
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
        proof_urls: retainedAttachments.map((attachment) => attachment.url),
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

  return (
    <SignupShell
      roleLabel="Nộp lại hồ sơ Ban tổ chức"
      roleIcon={Building2}
      title="Chỉnh sửa và nộp lại"
      description="Cập nhật thông tin hoặc tài liệu theo góp ý của quản trị viên. Tài khoản đăng nhập hiện tại vẫn được giữ nguyên."
      visualTitle="Hoàn thiện hồ sơ. Tiếp tục hành trình."
      visualDescription="Mỗi lần nộp được lưu thành một yêu cầu riêng để đảm bảo lịch sử xét duyệt minh bạch."
      highlights={organizerHighlights}
      currentStep={1}
      showLoginFooter={false}
    >
      {isLoading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-500">
          Đang tải hồ sơ gần nhất...
        </div>
      ) : (
        <form className="space-y-7" onSubmit={handleSubmit}>
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Lý do hồ sơ trước bị từ chối
              </p>
              <p className="mt-1 text-sm leading-6 text-red-700">
                {rejectionReason}
              </p>
            </div>
          </div>

          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Tên đơn vị / người đại diện *"
                id="resubmit-full-name"
                icon={User}
                value={formData.full_name}
                onChange={(event) =>
                  setFormData({ ...formData, full_name: event.target.value })
                }
                variant="signup"
              />
              <InputField
                label="Email đăng nhập"
                id="resubmit-email"
                icon={Mail}
                type="email"
                value={formData.email}
                disabled
                variant="signup"
              />
              <div className="sm:col-span-2">
                <SelectedField
                  label="Khoa hoặc đơn vị"
                  id="resubmit-department"
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
            </div>

            <InputField
              label="Nội dung hồ sơ đã chỉnh sửa *"
              id="resubmit-reason"
              icon={SquarePen}
              multiline
              rows={3}
              placeholder="Mô tả nội dung đã bổ sung hoặc điều chỉnh..."
              value={formData.reason}
              onChange={(event) =>
                setFormData({ ...formData, reason: event.target.value })
              }
              variant="signup"
            />
          </section>

          {retainedAttachments.length > 0 && (
            <section>
              <p className="text-sm font-semibold text-slate-700">
                Tài liệu từ hồ sơ trước
              </p>
              <div className="mt-2 space-y-2">
                {retainedAttachments.map((attachment) => (
                  <div
                    key={attachment.attachment_id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <FileText className="size-4 shrink-0 text-violet-600" />
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-sm text-slate-700 hover:text-violet-700"
                    >
                      {attachment.file_name}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setRetainedAttachments((attachments) =>
                          attachments.filter(
                            (item) =>
                              item.attachment_id !== attachment.attachment_id,
                          ),
                        )
                      }
                      aria-label={`Bỏ tệp ${attachment.file_name}`}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <UploadField
            label="Thêm tài liệu minh chứng mới"
            onFilesChange={setSelectedFiles}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Đang nộp lại..." : "Nộp lại hồ sơ"}
            {!isSubmitting && <ArrowRight className="size-4" />}
          </button>
        </form>
      )}
    </SignupShell>
  );
}
