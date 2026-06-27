import { Telescope, User, Mail, Lock, GraduationCap } from "lucide-react";
import hcmus from "../assets/hcmus.png";
import InputField from "../components/InputField";
import { Link } from "react-router-dom";

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
    role: "student",
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
    <div className="flex h-screen w-screen">
      <div
        className="flex-1 relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${hcmus})` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>

        <div className="absolute bottom-30 left-17 bg-white/70 h-49 w-lg rounded-lg shadow-sm p-6">
          <div className="flex flex-row gap-2 text-4xl items-center font-manrope text-purple-900 font-bold mb-5">
            <Telescope className="size-10" />
            <span>UniEvent</span>
          </div>
          <span className="text-gray-600">
            Structured Discovery for your academic journey. Connect with clubs,
            manage schedules, and explore events tailored to your major.
          </span>
        </div>
      </div>

      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="w-full max-w-lg">
          <p className="text-3xl font-bold font-manrope">Create account</p>

          <p className="text-[#4A4455] text-sm font-inter mt-2 mb-8">
            Enter your details to get started
          </p>
          <form className="space-y-4">
            <InputField
              label="Full name"
              id="fullname"
              placeholder="Nguyen Van A"
              icon={User}
            />

            <InputField
              label="Email"
              id="email"
              placeholder="abcd@gmail.com"
              icon={Mail}
              type="email"
            />

            <InputField
              label="Major"
              id="major"
              placeholder="Select your department"
              icon={GraduationCap}
            />

            <InputField
              label="Password"
              id="password"
              placeholder="******"
              icon={Lock}
              type="password"
            />

            <button
              type="submit"
              className="w-full h-12 rounded-lg bg-purple-800 text-white
             transition-all duration-200 hover:-translate-y-1 hover:bg-purple-950
             mt-10"
            >
              Create account
            </button>

            <div className="flex justify-center items-center mt-8 text-gray-600">
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
