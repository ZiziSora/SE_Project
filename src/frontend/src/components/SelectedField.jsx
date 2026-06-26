import { ChevronDown } from "lucide-react";

const SelectedField = ({
  id,
  label,
  icon: Icon,
  options,
  placeholder,
  bgColor = "bg-white",
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="font-inter text-gray-600">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

        <select
          id={id}
          className={`w-full h-10 border border-gray-400 rounded-lg pl-12 pr-10
                    appearance-none focus:outline-none
                    focus:ring-2 focus:ring-purple-500 ${bgColor}`}
          placeholder={placeholder}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
