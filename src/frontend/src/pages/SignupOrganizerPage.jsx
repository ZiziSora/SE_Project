import {
  Telescope,
  User,
  Mail,
  Lock,
  School,
  SquarePen,
  ArrowRight,
  BadgeCheck,
  Info,
} from "lucide-react";
import hcmus from "../assets/hcmus.png";
import InputField from "../components/InputField";
import SelectedField from "../components/SelectedField";
import UploadField from "../components/UploadField";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { signup } from "../api/authApi";
import { toast } from "react-toastify";
import { supabase } from "../libs/supabaseClient";

const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: localStorage.getItem("role") || "organizer",
    password: "",
    department_name: "",
    reason: "",
  });

  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileUpload = async (files) => {
    const uploadedUrls = [];
    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("organizer_proofs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("organizer_proofs").getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.full_name ||
      !formData.email ||
      !formData.password ||
      !formData.reason
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      let proofUrls = [];
      if (selectedFiles.length > 0) {
        proofUrls = await handleFileUpload(selectedFiles);
      }

      const payload = { ...formData, proof_urls: proofUrls };
      const result = await signup(payload);

      console.log(result);
      toast.success("Create account successfully!");
      localStorage.removeItem("role");
      setTimeout(() => navigate("/auth/login"), 2000);
    } catch (error) {
      console.log(error.response?.data);
      toast.error(error.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen">
      <div
        className="hidden md:flex flex-1 relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${hcmus})` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />

        <div className="absolute bottom-16 left-8 lg:bottom-30 lg:left-17 bg-white/70 backdrop-blur-sm rounded-xl shadow-md p-5 lg:p-6 max-w-xs lg:max-w-lg">

          <div className="flex flex-row gap-2 text-3xl lg:text-4xl items-center font-manrope text-purple-900 font-bold mb-3">
            <Telescope className="size-8 lg:size-10" />
            <span>UniEvent</span>
          </div>
          <span className="text-gray-600 text-sm lg:text-base">
            Khám phá sự kiện theo cách thông minh hơn. Tìm kiếm, đăng ký và tham gia các sự kiện phù hợp với sở thích và lĩnh vực học tập của bạn. 
          </span>
        </div>
      </div>

      <div className="flex-1 bg-[#FAFAFA] min-h-screen flex items-center justify-center px-4 py-10 md:px-8 md:py-10">
        <div className="w-full max-w-lg">
          <div className="flex md:hidden flex-row gap-2 items-center text-[#630ED4] text-xl font-semibold mb-6">
            <Telescope className="size-6" />
            <span className="font-manrope font-bold">UniEvent</span>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full px-3 py-1 mb-3 md:hidden">
            <BadgeCheck className="size-3.5" />
            Tài khoản ban tổ chức
          </span>

          <p className="text-2xl md:text-3xl font-bold font-manrope">
            Tạo tài khoản
          </p>
          <p className="text-[#4A4455] text-sm font-inter mt-1 mb-5">
            Điền thông tin bên dưới để gửi yêu cầu đăng ký quyền Ban tổ chức.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Thông tin cơ bản
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="Họ và tên *"
                  id="fullname"
                  placeholder="Nguyen Van A"
                  icon={User}
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
                <InputField
                  label="Email *"
                  id="email"
                  placeholder="abcd@gmail.com"
                  icon={Mail}
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectedField
                  label="Khoa"
                  id="department"
                  icon={School}
                  options={departmentOptions}
                  bgColor="bg-[#F8F9FF]"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      department_name: e.target.value,
                    })
                  }
                />
                <InputField
                  label="Mật khẩu *"
                  id="password"
                  placeholder="Gồm ít nhất 6 kí tự"
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Thông tin xác minh
              </p>
              <div className="space-y-3">
                <InputField
                  label="Lý do đăng ký"
                  id="reason"
                  placeholder="Mô tả tổ chức của bạn và lý do đăng ký quyền tạo sự kiện..."
                  icon={SquarePen}
                  multiline
                  rows={3}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                />

                <UploadField
                  label="Tài liệu minh chứng"
                  id="upload"
                  onFilesChange={(files) => setSelectedFiles(files)}
                />

                <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5 text-xs text-purple-700">
                  <Info className="size-3.5 mt-0.5 shrink-0" />
                  <span>
                    Yêu cầu đăng ký của bạn sẽ được quản trị viên xem xét. Vui lòng đính kèm tài liệu minh chứng rõ ràng về đơn vị hoặc tổ chức mà bạn đại diện để hỗ trợ quá trình xét duyệt.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-linear-to-r from-purple-700 to-purple-900
                text-white font-semibold flex items-center justify-center gap-2
                transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-200
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-1"
            >
              {loading ? (
                <>
                  <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Tạo tài khoản
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>

            <div className="flex justify-center items-center mt-3 text-gray-600 text-sm">
              <span>Đã có tài khoản?</span>
              <Link
                to="/auth/login"
                className="ml-1 text-[#630ED4] font-semibold hover:underline transition-colors"
              >
                Đăng nhập
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
