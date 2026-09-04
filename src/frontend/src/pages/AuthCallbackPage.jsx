import { CircleX, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getEmailVerificationStatus, verifyEmail } from "../api/authApi";
import { supabase } from "../lib/supabase";
import {
  clearPendingVerification,
  getPendingVerification,
} from "../lib/pendingVerification";

const INVALID_LINK_MESSAGE =
  "Liên kết xác minh không hợp lệ hoặc đã hết hạn.";
let activeVerificationRequest = null;

const getCallbackError = (url, hashParams) =>
  url.searchParams.get("error_description") ||
  hashParams.get("error_description") ||
  url.searchParams.get("error") ||
  hashParams.get("error");

const resolveCallbackAccessToken = async () => {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.slice(1));
  const callbackError = getCallbackError(url, hashParams);

  // Supabase khởi tạo ngay khi client được import và mặc định tự đọc callback
  // trong URL. Khi trang này chạy, hash có thể đã bị xóa nhưng session hợp lệ
  // đã được lưu, nên luôn ưu tiên chờ session do client khởi tạo.
  const {
    data: { session: initializedSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (initializedSession?.access_token) {
    return initializedSession.access_token;
  }

  if (callbackError) {
    throw new Error(INVALID_LINK_MESSAGE);
  }

  const code = url.searchParams.get("code");
  if (code) {
    const {
      data: { session: exchangedSession },
      error: exchangeError,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) throw exchangeError;
    if (exchangedSession?.access_token) {
      return exchangedSession.access_token;
    }
  }

  // Giữ tương thích với implicit flow cũ trong trường hợp client chưa kịp
  // tự tiêu thụ hash.
  const hashAccessToken = hashParams.get("access_token");
  if (hashAccessToken) return hashAccessToken;

  if (sessionError) throw sessionError;
  throw new Error(INVALID_LINK_MESSAGE);
};

const completeEmailVerification = async () => {
  const verificationState =
    new URL(window.location.href).searchParams.get("verification_state") ||
    getPendingVerification();
  let result;

  try {
    const accessToken = await resolveCallbackAccessToken();
    result = await verifyEmail(accessToken);
  } catch (linkError) {
    if (!verificationState) throw linkError;

    result = await getEmailVerificationStatus(verificationState);
  }

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Xác minh phía server đã thành công; lỗi dọn session cục bộ không được làm
    // người dùng nhận thông báo sai rằng link đã hết hạn.
  }

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  clearPendingVerification();
  return result;
};

const getVerificationRequest = () => {
  if (!activeVerificationRequest) {
    const request = completeEmailVerification();
    activeVerificationRequest = request;

    const releaseRequest = () => {
      window.setTimeout(() => {
        if (activeVerificationRequest === request) {
          activeVerificationRequest = null;
        }
      }, 10_000);
    };
    request.then(releaseRequest, releaseRequest);
  }
  return activeVerificationRequest;
};

const getVerificationErrorMessage = (error) =>
  error?.response?.data?.detail || error?.message || INVALID_LINK_MESSAGE;

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    getVerificationRequest()
      .then((result) => {
        if (cancelled) return;

        if (result.role === "organizer") {
          navigate(
            `/auth/signup/organizer/complete?status=${result.status}`,
            { replace: true },
          );
          return;
        }

        navigate("/auth/signup/student/complete", { replace: true });
      })
      .catch((error) => {
        if (cancelled) return;

        const message = getVerificationErrorMessage(error);
        setErrorMessage(message);
        toast.error(message);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (errorMessage) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <CircleX className="size-8" aria-hidden="true" />
          </div>
          <h1 className="mt-5 font-manrope text-2xl font-bold text-slate-900">
            Không thể hoàn tất xác minh
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {errorMessage}
          </p>
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            Trang này sẽ không tự chuyển sang đăng nhập. Nếu email đã được xác
            nhận, trạng thái hồ sơ của bạn vẫn được giữ nguyên trên hệ thống.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="mb-2 flex items-center gap-2 font-manrope text-2xl font-bold text-purple-800">
          <GraduationCap className="size-8" aria-hidden="true" />
          <span>UniEvent</span>
        </div>

        <div className="relative flex size-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-purple-700" />
          <div className="flex size-6 items-center justify-center rounded-full bg-purple-100">
            <div className="size-2.5 rounded-full bg-purple-600" />
          </div>
        </div>

        <h1 className="font-manrope text-xl font-semibold text-gray-800">
          Đang xác nhận email…
        </h1>
        <p className="max-w-xs text-sm text-gray-500">
          Vui lòng chờ, bạn sẽ được chuyển đến trang hoàn tất trong giây lát.
        </p>
      </div>
    </main>
  );
};

export default AuthCallbackPage;
