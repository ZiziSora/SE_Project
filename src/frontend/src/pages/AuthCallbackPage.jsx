import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { toast } from "react-toastify";
import { verifyEmail } from "../api/authApi";

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const activateAccount = async () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken) {
        toast.error("Liên kết xác minh không hợp lệ hoặc đã hết hạn.");
        navigate("/auth/login", { replace: true });
        return;
      }

      try {
        await verifyEmail(accessToken);

        if (cancelled) return;

        localStorage.setItem("access_token", accessToken);
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }

        navigate("/auth/login?verified=true", { replace: true });
      } catch (error) {
        if (cancelled) return;

        toast.error(
          error.response?.data?.detail || "Không thể kích hoạt tài khoản.",
        );
        navigate("/auth/login", { replace: true });
      }
    };

    activateAccount();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 text-purple-800 text-2xl font-bold font-manrope mb-2">
          <GraduationCap className="size-8" />
          <span>UniEvent</span>
        </div>

        {/* Spinner */}
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
          <div className="absolute inset-0 rounded-full border-4 border-t-purple-700 animate-spin" />
          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 font-manrope">
          Đang xác nhận email…
        </h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Vui lòng chờ, bạn sẽ được chuyển đến trang đăng nhập trong giây lát.
        </p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
