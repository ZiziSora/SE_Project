import { GraduationCap, Mail } from "lucide-react";
import InputField from "../components/InputField";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { forgotPassword } from "../api/authApi";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const data = await forgotPassword(email);

      setMessage(data.message);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#D8E3FB]/20 h-screen w-screen ">
      <div className="flex flex-col justify-item items-center gap-10 p-30">
        <div className="flex flex-row gap-1">
          <GraduationCap className="h-12 w-12 text-purple-800" />
          <p className="font-bold font-manrope text-5xl text-purple-800">
            UniEvent
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-140 h-fit bg-white shadow-lg rounded-lg border border-gray-100/30 p-6 flex flex-col justify-item items-center gap-3"
        >
          <h1 className="font-semibold font-inter text-xl">Đặt lại mật khẩu</h1>
          <p className="text-gray-500 mb-7">
            Nhập email của bạn để cài lại mật khẩu
          </p>

          <div className="w-full mb-7">
            <InputField
              label="Email tài khoản"
              id="email"
              placeholder="abcd@gmail.com"
              icon={Mail}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-linear-to-r from-[#630ED4]  to-[#D2BBFF] rounded-lg text-white font-inter font-semibold hover:-translate-y-1 duration-200"
          >
            {loading ? "Đang gửi..." : "Gửi liên kết"}
          </button>

          <button
            type="button"
            className="w-full h-12 text-purple-800 border border-purple-800 rounded-lg font-inter font-semibold hover:-translate-y-1 duration-200"
            onClick={() => navigate("/auth/login")}
          >
            Quay về trang đăng nhập
          </button>

          {message && <p>{message}</p>}
          {error && <p>{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
