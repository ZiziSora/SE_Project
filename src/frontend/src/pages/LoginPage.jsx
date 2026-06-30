import { GraduationCap } from "lucide-react";
import hcmus from "../assets/hcmus.png";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import InputField from "../components/InputField";
import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { toast } from "react-toastify";

const LoginPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!data.email || !data.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const result = await login(data);

      console.log(result); /* nho xoa */

      toast.success("Log in successfully");

      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);

      setTimeout(() => {
        navigate("/landingPage");
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

        <div className="absolute bottom-16 left-10 lg:bottom-30 lg:left-17 text-white">
          <h1 className="text-3xl lg:text-5xl font-bold mb-4 font-manrope">
            Structured Discovery
          </h1>

          <p className="text-base lg:text-xl max-w-md font-inter">
            Unlock your university experience. Connect, participate, and lead
            with UniEvent.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-10 md:px-0 md:py-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 md:w-175 h-75 bg-violet-300 rounded-full blur-3xl opacity-30"></div>

        <div className="bg-white shadow-xl w-full max-w-md rounded-2xl flex flex-col justify-center items-center relative z-10 py-10 px-2">
          <div className="flex flex-row gap-1 items-center text-[#630ED4] text-2xl font-semibold mb-2">
            <GraduationCap />
            <p className="font-manrope">UniEvent</p>
          </div>

          <p className="text-[#4A4455] text-sm font-inter mb-5">
            Sign in to your account
          </p>

          <form
            className="w-full px-6 md:px-8 space-y-3"
            onSubmit={handleSubmit}
          >
            <InputField
              label="Email"
              id="email"
              type="email"
              placeholder="abcd@gmail.com"
              bgColor="bg-white"
              icon={Mail}
              value={data.email}
              onChange={(e) =>
                setData({
                  ...data,
                  email: e.target.value,
                })
              }
            />
            <InputField
              label="Password"
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              bgColor="bg-white"
              icon={Lock}
              value={data.password}
              onChange={(e) =>
                setData({
                  ...data,
                  password: e.target.value,
                })
              }
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
            <div className="flex justify-end">
              <p className="font-inter text-sm text-purple-800 transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                Forgot password?
              </p>
            </div>

            <button
              type="submit"
              className="bg-purple-800 w-full h-12 rounded-lg hover:bg-purple-950 flex justify-center items-center transition-colors duration-200"
            >
              <p className="text-white font-inter">Login</p>
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <p className="text-[#4A4455] text-sm">Or continue with</p>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            <Link
              to="/auth/signup"
              className="border-purple-500 border-2 h-12 rounded-lg transition-all duration-200 hover:-translate-y-1 flex justify-center items-center mb-4"
            >
              <p className="text-purple-800 font-inter">Create an account</p>
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
