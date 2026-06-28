import { Route, Routes, BrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import SignupStudentPage from "./pages/SignupStudentPage.jsx";
import SignupOrganizerPage from "./pages/SignupOrganizerPage.jsx";
import SelectRolePage from "./pages/SelectRolePage.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth">
          <Route path="login" element={<LoginPage />} />

          <Route path="signup">
            <Route index element={<SelectRolePage />} />
            <Route path="student" element={<SignupStudentPage />} />
            <Route path="organizer" element={<SignupOrganizerPage />} />
          </Route>

          {/* <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} /> */}
        </Route>
      </Routes>

      <ToastContainer position="top-right" autoClose={2000} theme="light" />
    </BrowserRouter>
  );
}

export default App;
