import { GraduationCap, CheckCircle } from "lucide-react";
import hcmus from "../assets/hcmus.png";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../api/authApi";
import InputField from "../components/InputField";
import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { toast } from "react-toastify";

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";

  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!data.email || !data.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const result = await login({
        ...data,
        email: data.email.trim().toLowerCase(),
      });

      toast.success("Log in successfully");

      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);

      setTimeout(() => {
        navigate("/landingPage");
      }, 2000);
    } catch (error) {
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
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>

        <div className="absolute bottom-16 left-10 lg:bottom-30 lg:left-17 text-white">
          <h1 className="text-3xl lg:text-5xl font-bold mb-4 font-manrope">
            Khám phá thông minh
          </h1>

          <p className="text-base lg:text-xl max-w-md font-inter">
            Kết nối với các câu lạc bộ, tham gia sự kiện và phát triển bản thân cùng UniEvent.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-10 md:px-0 md:py-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 md:w-175 h-75 bg-violet-300 rounded-full blur-3xl opacity-30"></div>

        <div className="bg-white shadow-xl w-full max-w-md rounded-2xl flex flex-col justify-center items-center relative z-10 py-10 px-2">
          <div className="flex flex-row gap-1 items-center text-[#630ED4] text-2xl font-semibold mb-2">
            <GraduationCap className="h-7 w-7"/>
            <p className="font-manrope font-bold text-3xl">UniEvent</p>
          </div>

          <p className="text-[#4A4455] text-sm font-inter mb-5">
            Đăng nhập vào tài khoản
          </p>

          {/* Banner xác nhận email thành công */}
          {isVerified && (
            <div className="mx-6 md:mx-8 mb-3 flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <CheckCircle className="size-4 text-green-600 mt-0.5 shrink-0" />
              <p className="text-sm text-green-700 font-medium">
                Email đã được xác nhận! Hãy đăng nhập để tiếp tục.
              </p>
            </div>
          )}

          <form
            className="w-full px-6 md:px-8 space-y-3"
            onSubmit={handleSubmit}
          >
            <InputField
              label="Email"
              id="email"
              type="email"
              placeholder="abcd@gmail.com"
              bgColor="bg-white"
              icon={Mail}
              value={data.email}
              onChange={(e) =>
                setData({
                  ...data,
                  email: e.target.value,
                })
              }
            />
            <InputField
              label="Mật khẩu"
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Gồm ít nhất 6 kí tự"
              bgColor="bg-white"
              icon={Lock}
              value={data.password}
              onChange={(e) =>
                setData({
                  ...data,
                  password: e.target.value,
                })
              }
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
            <div className="flex justify-end">
              <p className="font-inter text-sm text-purple-800 transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                Quên mật khẩu?
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-purple-800 w-full h-12 rounded-lg hover:bg-purple-950 flex justify-center items-center transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <p className="text-white font-inter font-semibold">
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </p>
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <p className="text-[#4A4455] text-sm">Chưa có tài khoản?</p>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            <Link
              to="/auth/signup"
              className="border-purple-500 border-2 h-12 rounded-lg transition-all duration-200 hover:-translate-y-1 flex justify-center items-center mb-4"
            >
              <p className="text-purple-800 font-inter">Tạo tài khoản</p>
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
