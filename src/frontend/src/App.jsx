import { Route, Routes, BrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import SignupStudentPage from "./pages/SignupStudentPage.jsx";
import SignupOrganizerPage from "./pages/SignupOrganizerPage.jsx";
import SelectRolePage from "./pages/SelectRolePage.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import StudentProfile from "./pages/profile/StudentProfile.jsx";
import OrganizerProfile from "./pages/profile/OrganizerProfile.jsx";
import MyEventsPage from "./pages/MyEventsPage.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Navigate } from "react-router-dom";

function PlaceholderPage({ title, description }) {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f8f9fa] text-gray-900 px-6 py-16 text-center font-sans">
      <div className="max-w-md mx-auto bg-white border border-gray-100 rounded-3xl p-10 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500 mt-2">{description}</p>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="bg-[#F8F9FF] min-h-screen">
        <Routes>
          <Route path="/auth">
            <Route path="login" element={<LoginPage />} />
            <Route path="callback" element={<AuthCallbackPage />} />

            <Route path="signup">
              <Route index element={<SelectRolePage />} />
              <Route path="student" element={<SignupStudentPage />} />
              <Route path="organizer" element={<SignupOrganizerPage />} />
            </Route>

            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
          </Route>

          <Route path="/account">
            <Route path="student/profile" element={<StudentProfile />} />
            <Route path="organizer/profile" element={<OrganizerProfile />} />
          </Route>

          <Route path="/my-events" element={<MyEventsPage />} />
          <Route
            path="/explore"
            element={
              <PlaceholderPage
                title="Khám phá Sự kiện"
                description="Tính năng khám phá các sự kiện mới đang được phát triển."
              />
            }
          />

          <Route
            path="/history"
            element={
              <PlaceholderPage
                title="Lịch sử Tham gia"
                description="Trang xem lại lịch sử các sự kiện bạn đã hoàn thành."
              />
            }
          />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/my-events" replace />} />
        </Routes>
      </div>

      <ToastContainer position="top-right" autoClose={2000} theme="light" />
    </BrowserRouter>
  );
}

export default App;
