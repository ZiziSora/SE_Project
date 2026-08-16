import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";

import { getMyProfile } from "../api/profileApi.js";
import { supabase } from "../lib/supabase.js";
import { clearStoredAuthentication } from "../utils/authStorage.js";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const hasStoredToken = Boolean(localStorage.getItem("access_token"));
  const [authState, setAuthState] = useState(
    hasStoredToken ? "checking" : "unauthenticated",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!hasStoredToken) return undefined;

    let cancelled = false;

    async function synchronizeAuthentication() {
      try {
        const accessToken = localStorage.getItem("access_token");
        const refreshToken = localStorage.getItem("refresh_token");

        if (!accessToken || !refreshToken) {
          const authError = new Error("Phiên đăng nhập không đầy đủ.");
          authError.isAuthenticationError = true;
          throw authError;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error || !data.session) {
          const authError = new Error("Phiên đăng nhập đã hết hạn.");
          authError.isAuthenticationError = true;
          throw authError;
        }

        localStorage.setItem("access_token", data.session.access_token);
        localStorage.setItem("refresh_token", data.session.refresh_token);

        const profile = await getMyProfile();
        if (cancelled) return;

        localStorage.setItem("user_id", profile.user_id);
        localStorage.setItem("email", profile.email);
        localStorage.setItem("role", profile.role);
        localStorage.setItem("account_status", profile.status || "");
        localStorage.setItem(
          "can_manage_events",
          String(profile.can_manage_events),
        );
        setAuthState("authenticated");
      } catch (error) {
        if (cancelled) return;

        const responseStatus = error.response?.status;
        if (
          error.isAuthenticationError ||
          responseStatus === 401 ||
          responseStatus === 403
        ) {
          clearStoredAuthentication();
          setAuthState("unauthenticated");
          return;
        }

        setErrorMessage(
          error.response?.data?.detail ||
            "Không thể kiểm tra quyền truy cập. Vui lòng thử lại.",
        );
        setAuthState("error");
      }
    }

    synchronizeAuthentication();

    return () => {
      cancelled = true;
    };
  }, [hasStoredToken, retryKey]);

  if (authState === "unauthenticated") {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (authState === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f9ff] px-5 text-center">
        <div>
          <p className="text-sm font-semibold text-[#8f3030]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              setAuthState("checking");
              setErrorMessage("");
              setRetryKey((key) => key + 1);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#d8d0df] bg-white px-4 py-2.5 text-sm font-semibold text-[#51495a] hover:bg-[#f7f4fa]"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  if (authState === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f9ff] px-5 text-center">
        <div className="text-sm font-semibold text-[#62596d]">
          <LoaderCircle className="mx-auto mb-3 size-7 animate-spin text-[#7c3aed]" aria-hidden="true" />
          Đang kiểm tra quyền truy cập...
        </div>
      </main>
    );
  }

  return children;
}
