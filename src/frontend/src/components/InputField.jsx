import { Eye, EyeClosed } from "lucide-react"
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
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="font-inter text-gray-600">
        {label}
      </label>

      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

        <input
          id={id}
          type={type}
          placeholder={placeholder}
          className={`w-full h-12 border border-gray-400 rounded-lg pl-12 pr-4 ${bgColor}`}
          value={value}
          onChange={onChange}
        />

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
