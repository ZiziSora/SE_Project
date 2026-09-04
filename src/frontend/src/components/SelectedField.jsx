import { ChevronDown } from "lucide-react";

const SelectedField = ({
  id,
  label,
  icon: Icon,
  options,
  bgColor = "bg-white",
  value,
  onChange,
  variant = "default",
}) => {
  const isSignup = variant === "signup";

  return (
    <div className={isSignup ? "space-y-1.5" : "space-y-2"}>
      <label
        htmlFor={id}
        className={
          isSignup
            ? "text-sm font-semibold text-slate-700"
            : "font-inter font-bold text-gray-600"
        }
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className={`absolute left-4 top-1/2 -translate-y-1/2 ${
            isSignup ? "size-4.5 text-slate-400" : "text-gray-500"
          }`}
          aria-hidden="true"
        />

        <select
          id={id}
          className={`h-12 w-full appearance-none rounded-xl border pl-11 pr-10 text-sm outline-none transition-all duration-200 ${
            isSignup
              ? "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              : `border-gray-400 text-gray-500 ${bgColor}`
          }`}
          value={value}
          onChange={onChange}
        >
          <option value="">Chọn khoa của bạn</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
      </div>
    </div>
  );
};

export default SelectedField;
