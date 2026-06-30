import { UploadCloud, X, FileText } from "lucide-react";
import { useState } from "react";

const UploadField = ({ label, onFilesChange }) => {
  const [files, setFiles] = useState([]);

  const handleUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length === 0) return;

    const updatedFiles = [...files, ...selectedFiles];
    setFiles(updatedFiles);

    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
    e.target.value = "";
  };

  const handleRemove = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);

    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-gray-500 font-bold font-inter">{label}</label>

      <label
        className="
          flex flex-col items-center justify-center
          w-full h-36
          border-2 border-dashed border-gray-300
          rounded-lg
          cursor-pointer
          hover:border-purple-600
          hover:bg-purple-50
          transition
        "
      >
        <UploadCloud className="w-9 h-9 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">Nhấn vào đây để chọn tệp</p>
        <input
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleUpload}
          className="hidden"
          multiple
        />
      </label>

      {files.length > 0 && (
        <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}`}
              className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-sm text-gray-700 truncate">
                  {file.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadField;
