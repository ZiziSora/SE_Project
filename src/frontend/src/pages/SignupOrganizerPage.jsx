import {
  Telescope,
  User,
  Mail,
  Lock,
  School,
  SquarePen,
  ArrowRight,
  BadgeCheck,
  Info,
} from "lucide-react";
import hcmus from "../assets/hcmus.png";
import InputField from "../components/InputField";
import SelectedField from "../components/SelectedField";
import UploadField from "../components/UploadField";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { signup } from "../api/authApi";
import { toast } from "react-toastify";

const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const departmentOptions = [
    "Information Technology",
    "Chemistry",
    "Mathematics and Computer Science",
    "Physics and Engineering Physics",
    "Biology and Biotechnology",
    "Environment",
    "Geology",
    "Materials Science and Technology",
    "Electronics and Telecommunications",
    "Interdisciplinary Science",
  ];

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: localStorage.getItem("role") || "organizer",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const result = await signup(formData);
      console.log(result);
      toast.success("Create account successfully!");
      localStorage.removeItem("role");
      setTimeout(() => navigate("/auth/login"), 2000);
    } catch (error) {
      console.log(error.response?.data);
      toast.error(error.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen">
      <div
        className="hidden md:flex flex-1 relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${hcmus})` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />

        <div className="absolute bottom-16 left-8 lg:bottom-30 lg:left-17 bg-white/70 backdrop-blur-sm rounded-xl shadow-md p-5 lg:p-6 max-w-xs lg:max-w-lg">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full px-3 py-1 mb-3">
            <BadgeCheck className="size-3.5" />
            Organizer Account
          </span>

          <div className="flex flex-row gap-2 text-3xl lg:text-4xl items-center font-manrope text-purple-900 font-bold mb-3">
            <Telescope className="size-8 lg:size-10" />
            <span>UniEvent</span>
          </div>
          <span className="text-gray-600 text-sm lg:text-base">
            Structured Discovery for your academic journey. Connect with clubs,
            manage schedules, and explore events tailored to your major.
          </span>
        </div>
      </div>

      <div className="flex-1 bg-[#FAFAFA] min-h-screen flex items-center justify-center px-4 py-10 md:px-8 md:py-10">
        <div className="w-full max-w-lg">
          <div className="flex md:hidden flex-row gap-2 items-center text-[#630ED4] text-xl font-semibold mb-6">
            <Telescope className="size-6" />
            <span className="font-manrope font-bold">UniEvent</span>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full px-3 py-1 mb-3 md:hidden">
            <BadgeCheck className="size-3.5" />
            Organizer Account
          </span>

          <p className="text-2xl md:text-3xl font-bold font-manrope">
            Create account
          </p>
          <p className="text-[#4A4455] text-sm font-inter mt-1 mb-5">
            Fill in the details below to request organizer access
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Personal Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="Full name *"
                  id="fullname"
                  placeholder="Nguyen Van A"
                  icon={User}
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
                <InputField
                  label="Email *"
                  id="email"
                  placeholder="abcd@gmail.com"
                  icon={Mail}
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Account Setup
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectedField
                  label="Department"
                  id="department"
                  icon={School}
                  options={departmentOptions}
                  bgColor="bg-[#F8F9FF]"
                />
                <InputField
                  label="Password *"
                  id="password"
                  placeholder="At least 6 characters"
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Verification
              </p>
              <div className="space-y-3">
                <InputField
                  label="Reason for organization access"
                  id="reason"
                  placeholder="Describe your organization and why you need event creation permissions..."
                  icon={SquarePen}
                  multiline
                  rows={3}
                />

                <UploadField label="Upload proof of affiliation" id="upload" />

                {/* Tip callout */}
                <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5 text-xs text-purple-700">
                  <Info className="size-3.5 mt-0.5 shrink-0" />
                  <span>
                    Your request will be reviewed by an admin. Please provide
                    clear evidence of your affiliation for faster approval.
                  </span>
                </div>
              </div>
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-700 to-purple-900
                text-white font-semibold flex items-center justify-center gap-2
                transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-200
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-1"
            >
              {loading ? (
                <>
                  <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>

            <div className="flex justify-center items-center mt-3 text-gray-600 text-sm">
              <span>Already have an account?</span>
              <Link
                to="/auth/login"
                className="ml-1 text-[#630ED4] font-semibold hover:underline transition-colors"
              >
                Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
