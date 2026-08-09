import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Lock,
  ShieldCheck,
  Telescope,
} from "lucide-react";

import hcmus from "../assets/hcmus.png";
import InputField from "../components/InputField";
import { supabase } from "../libs/supabaseClient";

const INVALID_LINK_MESSAGE =
  "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const markReady = (session) => {
      if (!mounted || !session) return;
      setStatus("ready");
      setError("");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        markReady(session);
      }
    });

    async function initializeRecovery() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const queryParams = new URLSearchParams(window.location.search);
      const urlError =
        hashParams.has("error_description") ||
        queryParams.has("error_description");

      if (urlError) {
        if (mounted) {
          setError(INVALID_LINK_MESSAGE);
          setStatus("invalid");
        }
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const isRecoveryLink = hashParams.get("type") === "recovery";
      const hasCode = queryParams.has("code");

      if (isRecoveryLink && accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError || !data.session) {
          if (mounted) {
            setError(INVALID_LINK_MESSAGE);
            setStatus("invalid");
          }
          return;
        }

        markReady(data.session);
        return;
      }

      if (hasCode) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!sessionError && session) {
          markReady(session);
          return;
        }
      }

      if (mounted) {
        setError(INVALID_LINK_MESSAGE);
        setStatus("invalid");
      }
    }

    initializeRecovery();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (status !== "ready") {
      setError(INVALID_LINK_MESSAGE);
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setStatus("success");
      await supabase.auth.signOut();

      window.setTimeout(() => {
        navigate("/auth/login?password_reset=success", { replace: true });
      }, 1200);
    } catch {
      setError("Không thể cập nhật mật khẩu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-screen bg-white">
      <div
        className="relative hidden flex-1 bg-cover bg-center md:block"
        style={{ backgroundImage: `url(${hcmus})` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-purple-950/10" />
        <div className="absolute bottom-12 left-10 right-10 max-w-xl rounded-2xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur-md lg:bottom-20 lg:left-16">
          <div className="mb-3 flex items-center gap-2 text-3xl font-bold text-purple-900">
            <Telescope className="size-9" />
            <span className="font-manrope">UniEvent</span>
          </div>
          <p className="leading-relaxed text-gray-700">
            Bảo vệ tài khoản của bạn bằng một mật khẩu mới an toàn và dễ ghi
            nhớ.
          </p>
        </div>
      </div>

      <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-[#FBFAFF] px-4 py-10">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-purple-200/40 blur-3xl" />
        <div className="absolute -bottom-32 left-10 size-96 rounded-full bg-violet-200/40 blur-3xl" />

        <section className="relative z-10 w-full max-w-md rounded-3xl border border-purple-100 bg-white p-6 shadow-[0_24px_70px_rgba(83,32,139,0.12)] sm:p-9">
          <div className="mb-7">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <ShieldCheck className="size-7" />
            </div>
            <h1 className="font-manrope text-2xl font-bold text-gray-950 sm:text-3xl">
              Đặt lại mật khẩu
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Tạo mật khẩu mới để tiếp tục sử dụng tài khoản UniEvent.
            </p>
          </div>

          {status === "checking" && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <span className="size-8 animate-spin rounded-full border-3 border-purple-100 border-t-purple-700" />
              <p className="text-sm font-medium text-gray-500">
                Đang kiểm tra liên kết đặt lại mật khẩu...
              </p>
            </div>
          )}

          {status === "invalid" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-relaxed text-red-700">
                {error || INVALID_LINK_MESSAGE}
              </div>
              <Link
                to="/auth/forgot-password"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-purple-700 font-semibold text-white transition hover:bg-purple-800"
              >
                Gửi lại liên kết mới
              </Link>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle className="size-8" />
              </div>
              <div>
                <h2 className="font-manrope text-xl font-bold text-gray-900">
                  Đổi mật khẩu thành công
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Bạn sẽ được chuyển về trang đăng nhập.
                </p>
              </div>
            </div>
          )}

          {status === "ready" && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <InputField
                label="Mật khẩu mới"
                id="new-password"
                icon={Lock}
                type={showPassword ? "text" : "password"}
                placeholder="Nhập ít nhất 6 ký tự"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                bgColor="bg-[#FAF9FF]"
              />

              <InputField
                label="Xác nhận mật khẩu mới"
                id="confirm-new-password"
                icon={Lock}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                showPassword={showConfirmPassword}
                setShowPassword={setShowConfirmPassword}
                bgColor="bg-[#FAF9FF]"
              />

              <div className="rounded-xl bg-purple-50 px-4 py-3 text-xs text-purple-800">
                <div className="flex items-center gap-2">
                  <Check className="size-4" />
                  Mật khẩu cần có ít nhất 6 ký tự.
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-linear-to-r from-purple-700 to-purple-900 font-semibold text-white shadow-lg shadow-purple-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </button>
            </form>
          )}

          {status !== "success" && (
            <Link
              to="/auth/login"
              className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-purple-700 transition hover:text-purple-900"
            >
              <ArrowLeft className="size-4" />
              Quay lại đăng nhập
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
