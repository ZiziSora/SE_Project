import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { EventDetailPage } from "./pages/EventDetailPage.jsx";
import { DEFAULT_EVENT_ID } from "./utils/eventDetailUtils.js";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AllEvents from "./pages/AllEventsPage.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import CreateEvent from "./pages/CreateEventPage.jsx";
import EditEvent from "./pages/EditEventPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ManageEvents from "./pages/ManageEventsPage.jsx";
import MyEventsPage from "./pages/MyEventsPage.jsx";
import OrganizerProfile from "./pages/profile/OrganizerProfile.jsx";
import StudentProfile from "./pages/profile/StudentProfile.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import AdminStatisticsPage from "./pages/admin/AdminStatisticsPage.jsx";
import ReviewOrganizerRequest from "./pages/admin/ReviewOrganizerRequest.jsx";
import SelectRolePage from "./pages/SelectRolePage.jsx";
import SignupOrganizerPage from "./pages/SignupOrganizerPage.jsx";
import OrganizerSignupCompletePage from "./pages/OrganizerSignupCompletePage.jsx";
import SignupStudentPage from "./pages/SignupStudentPage.jsx";
import StudentSignupCompletePage from "./pages/StudentSignupCompletePage.jsx";
import ViewEvent from "./pages/ViewEventPage.jsx";
import AdminEventReviewsPage from "./pages/admin/AdminEventReviewsPage.jsx";
import AdminEventReviewDetailPage from "./pages/admin/AdminEventReviewDetailPage.jsx";
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

function HomePage() {
  const canManageEvents = localStorage.getItem("can_manage_events") === "true";

  return canManageEvents ? (
    <ManageEvents />
  ) : (
    <Navigate to={`/events/${DEFAULT_EVENT_ID}`} replace />
  );
}

function EventsIndexPage() {
  const canManageEvents = localStorage.getItem("can_manage_events") === "true";

  return canManageEvents ? (
    <Navigate to="/" replace />
  ) : (
    <Navigate to={`/events/${DEFAULT_EVENT_ID}`} replace />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-event"
          element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/all-events"
          element={
            <ProtectedRoute>
              <AllEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-event/:eventId"
          element={
            <ProtectedRoute>
              <EditEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/:eventId"
          element={
            <ProtectedRoute>
              <ViewEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <EventsIndexPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute>
              <EventDetailPage />
            </ProtectedRoute>
          }
        />

        <Route path="/auth">
          <Route path="login" element={<LoginPage />} />
          <Route path="callback" element={<AuthCallbackPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="signup">
            <Route index element={<SelectRolePage />} />
            <Route path="student" element={<SignupStudentPage />} />
            <Route
              path="student/complete"
              element={<StudentSignupCompletePage />}
            />
            <Route path="organizer" element={<SignupOrganizerPage />} />
            <Route
              path="organizer/complete"
              element={<OrganizerSignupCompletePage />}
            />
          </Route>
        </Route>

        <Route path="/account">
          <Route path="student/profile" element={<StudentProfile />} />
          <Route path="organizer/profile" element={<OrganizerProfile />} />
        </Route>

        <Route
          path="/my-events"
          element={
            <ProtectedRoute>
              <MyEventsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/admin">
          <Route
            path="organizer-requests"
            element={
              <ProtectedRoute>
                <ReviewOrganizerRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="statistics"
            element={
              <ProtectedRoute>
                <AdminStatisticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="manage-events"
            element={
              <ProtectedRoute>
                <AdminEventReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="events/:eventId"
            element={
              <ProtectedRoute>
                <AdminEventReviewDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>

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

      <ToastContainer position="top-right" autoClose={2000} theme="light" />
    </BrowserRouter>
  );
}
