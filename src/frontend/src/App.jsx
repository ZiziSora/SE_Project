import { Route, Routes, BrowserRouter, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { EventDetailPage } from "./EventDetailPage.jsx";
import { DEFAULT_EVENT_ID } from "./components/EventDetail/eventDetailUtils";

import LoginPage from "./pages/LoginPage.jsx";
import SignupStudentPage from "./pages/SignupStudentPage.jsx";
import SignupOrganizerPage from "./pages/SignupOrganizerPage.jsx";
import SelectRolePage from "./pages/SelectRolePage.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import StudentProfile from "./pages/profile/StudentProfile.jsx";
import OrganizerProfile from "./pages/profile/OrganizerProfile.jsx";

function App() {
  return (
    <BrowserRouter>
      <div className="bg-[#F8F9FF] min-h-screen">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={`/events/${DEFAULT_EVENT_ID}`} replace />}
          />
          <Route
            path="/events"
            element={<Navigate to={`/events/${DEFAULT_EVENT_ID}`} replace />}
          />
          <Route path="/events/:eventId" element={<EventDetailPage />} />

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

          <Route
            path="*"
            element={<Navigate to={`/events/${DEFAULT_EVENT_ID}`} replace />}
          />
        </Routes>
      </div>

      <ToastContainer position="top-right" autoClose={2000} theme="light" />
    </BrowserRouter>
  );
}

export default App;
