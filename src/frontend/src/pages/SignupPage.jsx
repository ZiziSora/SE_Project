import {
  Telescope,
  User,
  Mail,
  Lock,
  GraduationCap,
  BadgeCheck,
} from "lucide-react";
import hcmus from "../assets/hcmus.png";
import InputField from "../components/InputField";
import SelectedField from "../components/SelectedField";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { signup } from "../api/authApi";
import { toast } from "react-toastify";
const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const roleOptions = [
    {
      value: "student",
      label: "Student",
    },
    {
      value: "organizer",
      label: "Organizer",
    },
  ];

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const result = await signup(formData);

      console.log(result);

      toast.success("Create account successfully!");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.log(error.response.data);
      toast.error(error.response?.data?.detail || "Something went wrong");
    }
  };
  return (
    <div className="flex min-h-screen w-screen">
      <div
        className="hidden md:flex flex-1 relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${hcmus})` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>

        <div className="absolute bottom-16 left-8 lg:bottom-30 lg:left-17 bg-white/70 rounded-lg shadow-sm p-5 lg:p-6 max-w-xs lg:max-w-lg">
          <div className="flex flex-row gap-2 text-3xl lg:text-4xl items-center font-manrope text-purple-900 font-bold mb-4">
            <Telescope className="size-8 lg:size-10" />
            <span>UniEvent</span>
          </div>
          <span className="text-gray-600 text-sm lg:text-base">
            Structured Discovery for your academic journey. Connect with clubs,
            manage schedules, and explore events tailored to your major.
          </span>
        </div>
      </div>

      <div className="flex-1 bg-white min-h-screen flex items-center justify-center px-4 py-10 md:px-6 md:py-0">
        <div className="w-full max-w-lg">
          <div className="flex md:hidden flex-row gap-2 items-center text-[#630ED4] text-xl font-semibold mb-6">
            <Telescope className="size-6" />
            <span className="font-manrope font-bold">UniEvent</span>
          </div>

          <p className="text-2xl md:text-3xl font-bold font-manrope">
            Create account
          </p>

          <p className="text-[#4A4455] text-sm font-inter mt-2 mb-8">
            Enter your details to get started
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <InputField
              label="Full name"
              id="fullname"
              placeholder="Nguyen Van A"
              icon={User}
              value={formData.full_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  full_name: e.target.value,
                })
              }
            />

            <InputField
              label="Email"
              id="email"
              placeholder="abcd@gmail.com"
              icon={Mail}
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  email: e.target.value,
                })
              }
            />

            <SelectedField
              label="Role"
              id="role"
              icon={BadgeCheck}
              options={roleOptions}
              bgColor="bg-[#F8F9FF]"
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value,
                })
              }
            />

            <InputField
              label="Password"
              id="password"
              placeholder="At least 6 characters"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  password: e.target.value,
                })
              }
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />

            <button
              type="submit"
              className="w-full h-12 rounded-lg bg-purple-800 text-white
             transition-all duration-200 hover:-translate-y-1 hover:bg-purple-950
             mt-8 md:mt-10"
            >
              Create account
            </button>

            <div className="flex justify-center items-center mt-6 md:mt-8 text-gray-600">
              <span>Already have an account?</span>

              <Link
                to="/login"
                className="ml-1 text-[#630ED4] font-medium hover:underline transition-colors"
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
