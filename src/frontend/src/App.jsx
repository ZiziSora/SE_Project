import { Route, Routes, BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import OrganizerHomePage from "./pages/OrganizerHomePage.jsx";
import "react-toastify/dist/ReactToastify.css";

// Import Pages
import ExploreEventsPage from "./pages/ExploreEventsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupStudentPage from "./pages/SignupStudentPage.jsx";
import SignupOrganizerPage from "./pages/SignupOrganizerPage.jsx";
import SelectRolePage from "./pages/SelectRolePage.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import StudentProfile from "./pages/profile/StudentProfile.jsx";
import OrganizerProfile from "./pages/profile/OrganizerProfile.jsx";

// Import Components
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-[#F8F9FF] min-h-screen">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRole="student">
                <ExploreEventsPage />
              </ProtectedRoute>
            }
          />

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
        </Routes>
      </div>

      <ToastContainer position="top-right" autoClose={2000} theme="light" />
    </BrowserRouter>
  );
}