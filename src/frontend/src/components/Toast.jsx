import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function Toast({ toast }) {
    if (!toast) return null;

    return (
        <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all animate-bounce ${toast.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
        >
            {toast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className="text-xs font-semibold">{toast.message}</span>
        </div>
    );
}