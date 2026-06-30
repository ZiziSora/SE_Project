import {
  Telescope,
  User,
  Mail,
  Lock,
  GraduationCap,
  School,
  ArrowRight,
} from "lucide-react";
import hcmus from "../assets/hcmus.png";
import InputField from "../components/InputField";
import SelectedField from "../components/SelectedField";
import { Link, useNavigate } from "react-router-dom";
import { use, useState } from "react";
import { signup } from "../api/authApi";
import { toast } from "react-toastify";
const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false);
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
    role: localStorage.getItem("role") || "student",
    department_name: "",
    password: "",
  });

  const [loading, isLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      isLoading(true);
      const result = await signup(formData);

      console.log(result);

      toast.success("Create account successfully!");
      localStorage.removeItem("role");
      setTimeout(() => {
        navigate("/auth/login");
      }, 2000);
    } catch (error) {
      console.log(error.response.data);
      toast.error(error.response?.data?.detail || "Something went wrong");
    } finally {
      isLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen w-screen">
      <div
        className="hidden md:flex flex-1 relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${hcmus})` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>

        <div className="absolute bottom-16 left-8 lg:bottom-30 lg:left-17 bg-white/70 rounded-lg shadow-sm p-5 lg:p-6 max-w-xs lg:max-w-lg">
          <div className="flex flex-row gap-2 text-3xl lg:text-4xl items-center font-manrope text-purple-900 font-bold mb-4">
            <Telescope className="size-8 lg:size-10" />
            <span>UniEvent</span>
          </div>
          <span className="text-gray-600 text-sm lg:text-base">
            Khám phá sự kiện theo cách thông minh hơn. Tìm kiếm, đăng ký và tham
            gia các sự kiện phù hợp với sở thích và lĩnh vực học tập của bạn.
          </span>
        </div>
      </div>

      <div className="flex-1 bg-white min-h-screen flex items-center justify-center px-4 py-10 md:px-6 md:py-0">
        <div className="w-full max-w-lg">
          <div className="flex md:hidden flex-row gap-2 items-center text-[#630ED4] text-xl font-semibold mb-6">
            <Telescope className="size-6" />
            <span className="font-manrope font-bold">UniEvent</span>
          </div>

          <p className="text-2xl md:text-4xl font-bold font-manrope">
            Tạo tài khoản
          </p>

          <p className="text-[#4A4455] text-sm font-inter mt-2 mb-8">
            Điền thông tin bên dưới để tiếp tục
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <InputField
              label="Họ và tên *"
              id="fullname"
              placeholder="Nguyen Van A"
              icon={User}
              value={formData.full_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  full_name: e.target.value,
                })
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
                setFormData({
                  ...formData,
                  email: e.target.value,
                })
              }
            />

            <InputField
              label="Mật khẩu *"
              id="password"
              placeholder="At least 6 characters"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  password: e.target.value,
                })
              }
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />

            <SelectedField
              label="Khoa"
              id="department"
              icon={School}
              options={departmentOptions}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  department_name: e.target.value,
                })
              }
              bgColor="bg-[#F8F9FF]"
            />

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

            <div className="flex justify-center items-center mt-6 md:mt-8 text-gray-600">
              <span>Đã có tài khoản?</span>

              <Link
                to="/auth/login"
                className="ml-1 text-[#630ED4] font-medium hover:underline transition-colors"
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
