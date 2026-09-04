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
    <div className="space-y-1.5">
      <span className="block text-sm font-semibold text-slate-700">{label}</span>

      <label
        className="group flex min-h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-5 text-center transition-all duration-200 hover:border-violet-400 hover:bg-violet-50 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm transition-transform duration-300 group-hover:-translate-y-1">
          <UploadCloud className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          Chọn tài liệu minh chứng
        </p>
        <p className="mt-1 text-xs text-slate-400">
          PDF, Word hoặc hình ảnh · tối đa 5 tệp, mỗi tệp 5MB
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx"
          onChange={handleUpload}
          className="hidden"
          multiple
        />
      </label>

      {files.length > 0 && (
        <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 shrink-0 text-violet-500" />
                <span className="truncate text-sm text-slate-700">
                  {file.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="Xóa tệp"
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
