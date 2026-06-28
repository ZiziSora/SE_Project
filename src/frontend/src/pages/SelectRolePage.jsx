import hcmus from "../assets/hcmus.png";
import { GraduationCap, User, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SelectedCard = ({ role }) => {
  const Icon = role.icon;
  const navigate = useNavigate();

  const handleClick = (e) => {
    localStorage.setItem("role", role.roleValue);
    navigate(role.rolePath);
  };

  return (
    <div
      className="w-99.25 h-38.25 border border-gray-200 shadow-xl rounded-lg mb-10 p-5 flex flex-row gap-4 hover:border-purple-600 hover:-translate-y-2 duration-200"
      onClick={(e) => handleClick(e)}
    >
      <Icon className="bg-[#E5EEFF] w-8 h-8 p-1.5 rounded-md text-[#630ED4]" />
      <div className="flex flex-col">
        <span className="font-semibold font-manrope text-lg">{role.label}</span>
        <span className="font-inter font-light text-sm mb-5">
          {role.description}
        </span>
        <div className="flex flex-row gap-2">
          <button className="flex justify-start text-purple-800 font-medium font-inter hover:underline hover:decoration-purple-800">
            Select
          </button>
          <ArrowRight className="text-purple-800 h-5 w-5 " />
        </div>
      </div>
    </div>
  );
};

const SelectRolePage = () => {
  const roles = [
    {
      label: "Student",
      roleValue: "student",
      description:
        "Discover events, join clubs, and manage your academic schedule.",
      icon: User,
      rolePath: "/auth/signup/student",
    },
    {
      label: "Organizer",
      roleValue: "organizer",
      description:
        "Create events, manage participants, and grow your organization.",
      icon: Users,
      rolePath: "/auth/signup/organizer",
    },
  ];
  return (
    <div className="flex min-h-screen w-screen">
      <div
        className="hidden md:flex flex-1 relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${hcmus})` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>

        <div className="absolute bottom-16 left-10 lg:bottom-30 lg:left-17 text-white">
          <h1 className="text-3xl lg:text-5xl font-bold mb-4 font-manrope">
            Elevate Your Campus Experience
          </h1>

          <p className="text-base lg:text-xl max-w-md font-inter">
            Connect with peers, manage events, and discover new opportunities
            across your university ecosystem.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-10 md:px-0 md:py-0">
        <div className="flex flex-row gap-1 items-center text-[#630ED4] text-3xl font-semibold mb-2">
          <GraduationCap />
          <p className="font-manrope">UniEvent</p>
        </div>
        <span className="font-manrope font-bold text-4xl">
          Join the community
        </span>
        <span className="font-inter text-md font-light mb-10">
          Select your role to get started
        </span>

        {roles.map((role) => (
          <SelectedCard key={role.label} role={role} />
        ))}
      </div>
    </div>
  );
};

export default SelectRolePage;
