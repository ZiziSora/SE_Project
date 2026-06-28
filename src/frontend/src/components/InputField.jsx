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
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="font-inter text-gray-600 font-bold">
        {label}
      </label>

      <div className="relative">
        <Icon className="absolute left-4 top-3.5 text-gray-500" />

        {multiline ? (
          <textarea
            id={id}
            rows={rows}
            placeholder={placeholder}
            className={`w-full border border-gray-400 rounded-lg pl-12 pr-4 py-3 resize-none ${bgColor}`}
            value={value}
            onChange={onChange}
          />
        ) : (
          <input
            id={id}
            type={type}
            placeholder={placeholder}
            className={`w-full h-12 border border-gray-400 rounded-lg pl-12 pr-4 ${bgColor}`}
            value={value}
            onChange={onChange}
          />
        )}

        {setShowPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {showPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default InputField;
