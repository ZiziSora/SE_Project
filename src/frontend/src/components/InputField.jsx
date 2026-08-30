import { Eye, EyeClosed } from "lucide-react";

const InputField = ({
  label,
  id,
  type = "text",
  placeholder,
  icon: Icon,
  bgColor = "bg-[#F8F9FF]",
  value,
  onChange,
  showPassword,
  setShowPassword,
  multiline = false,
  rows = 4,
  required = false,
  autoComplete,
  minLength,
  disabled = false,
  variant = "default",
}) => {
  const isSignup = variant === "signup";
  const fieldClasses = isSignup
    ? "border-slate-200 bg-white text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
    : `border-gray-400 ${bgColor}`;

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
          className={`absolute left-4 text-gray-500 ${
            multiline ? "top-3.5" : "top-1/2 -translate-y-1/2"
          } ${isSignup ? "size-4.5 text-slate-400" : ""}`}
          aria-hidden="true"
        />

        {multiline ? (
          <textarea
            id={id}
            rows={rows}
            placeholder={placeholder}
            className={`w-full resize-none rounded-xl border py-3 pl-11 pr-4 text-sm leading-6 ${fieldClasses}`}
            value={value}
            onChange={onChange}
            required={required}
            autoComplete={autoComplete}
            minLength={minLength}
            disabled={disabled}
          />
        ) : (
          <input
            id={id}
            type={type}
            placeholder={placeholder}
            className={`h-12 w-full rounded-xl border pl-11 text-sm ${
              setShowPassword ? "pr-11" : "pr-4"
            } ${fieldClasses}`}
            value={value}
            onChange={onChange}
            required={required}
            autoComplete={autoComplete}
            minLength={minLength}
            disabled={disabled}
          />
        )}

        {setShowPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default InputField;
