import {
  BrowserRouter,
  Link,
  Route,
  Routes,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AllEvents from "./pages/all-events.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import CreateEvent from "./pages/create-event.jsx";
import EditEvent from "./pages/edit-event.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ManageEvents from "./pages/manage-events.jsx";
import MyEventsPage from "./pages/MyEventsPage.jsx";
import OrganizerProfile from "./pages/profile/OrganizerProfile.jsx";
import StudentProfile from "./pages/profile/StudentProfile.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import SelectRolePage from "./pages/SelectRolePage.jsx";
import SignupOrganizerPage from "./pages/SignupOrganizerPage.jsx";
import SignupStudentPage from "./pages/SignupStudentPage.jsx";
import ViewEvent from "./pages/view-event.jsx";

function PlaceholderPage({ title, description }) {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-6 py-16 text-center text-gray-900">
      <div className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-10 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-6 py-16 text-center text-gray-900">
      <div className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-10 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">
          Không tìm thấy trang
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Đường dẫn này chưa được khai báo trong hệ thống.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-purple-700 hover:text-purple-800"
        >
          Quay lại Dashboard
        </Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ManageEvents />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/all-events" element={<AllEvents />} />
        <Route path="/edit-event/:eventId" element={<EditEvent />} />
        <Route path="/events/:eventId" element={<ViewEvent />} />

        <Route path="/auth">
          <Route path="login" element={<LoginPage />} />
          <Route path="callback" element={<AuthCallbackPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="signup">
            <Route index element={<SelectRolePage />} />
            <Route path="student" element={<SignupStudentPage />} />
            <Route path="organizer" element={<SignupOrganizerPage />} />
          </Route>
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
              title="Khám phá sự kiện"
              description="Tính năng khám phá các sự kiện mới đang được phát triển."
            />
          }
        />
        <Route
          path="/history"
          element={
            <PlaceholderPage
              title="Lịch sử tham gia"
              description="Trang xem lại lịch sử các sự kiện bạn đã hoàn thành."
            />
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        theme="light"
      />
    </BrowserRouter>
  );
}
