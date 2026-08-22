import { useState, useRef, useEffect } from "react";
import {
  X,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  UserCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { processCheckin } from "../../api/checkinApi.js";

export default function QRScannerModal({
  eventId,
  eventTitle,
  isOpen,
  onClose,
  onSuccessCheckin,
}) {
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const playSuccessSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Ignore audio error
    }
  };

  const handleCheckinSubmit = async (codeToSubmit) => {
    const cleanCode = (codeToSubmit || qrCodeInput).trim();
    if (!cleanCode || submitting) return;

    try {
      setSubmitting(true);
      setScanResult(null);

      const data = await processCheckin({
        eventId: eventId || null,
        code: cleanCode,
      });

      playSuccessSound();

      setScanResult({
        type: "success",
        message: data.message || "Check-in thành công!",
        participant: data.participant,
        event: data.event,
        time: new Date(data.checked_in_at || Date.now()).toLocaleTimeString("vi-VN"),
      });

      setQrCodeInput("");
      if (onSuccessCheckin) {
        onSuccessCheckin(data);
      }
    } catch (err) {
      const status = err.response?.status;
      const detailMsg =
        err.response?.data?.detail ||
        err.message ||
        "Có lỗi xảy ra khi thực hiện check-in.";

      if (status === 409) {
        setScanResult({
          type: "conflict",
          message: detailMsg,
        });
      } else {
        setScanResult({
          type: "error",
          message: detailMsg,
        });
      }
    } finally {
      setSubmitting(false);
      // Tạm dừng 2 giây trước khi cho phép quét mã kế tiếp (tránh spam quét 1 mã liên tục)
      setTimeout(() => {
        isScanningRef.current = false;
      }, 2000);
    }
  };

  // Khởi tạo quét QR bằng Camera
  useEffect(() => {
    if (!isOpen) return;

    const qrElementId = "qr-reader-container";
    const html5QrCode = new Html5Qrcode(qrElementId);
    scannerRef.current = html5QrCode;

    const qrCodeSuccessCallback = (decodedText) => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      handleCheckinSubmit(decodedText);
    };

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        undefined
      )
      .catch((err) => {
        console.warn("Không thể bật camera:", err);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current.clear())
          .catch(() => { });
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-purple-950 px-6 py-5 text-white flex items-center justify-between relative">
          <div>
            <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-0.5">
              <UserCheck className="w-4 h-4" />
              Điểm danh Sự kiện bằng QR Code
            </div>
            <h2 className="text-lg font-bold text-white line-clamp-1 pr-6">
              {eventTitle || "Trình quét Mã QR Check-in"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-5">
          {/* Kết quả Check-in */}
          {scanResult && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              {scanResult.type === "success" && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                          CHECK-IN THÀNH CÔNG
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {scanResult.time}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-emerald-950 mt-1">
                        {scanResult.participant?.full_name || scanResult.participant?.email}
                      </h4>
                      <div className="mt-1 text-xs text-emerald-900 space-y-0.5">
                        {scanResult.participant?.student_code && (
                          <p><span className="font-semibold">MSSV:</span> {scanResult.participant.student_code}</p>
                        )}
                        <p><span className="font-semibold">Email:</span> {scanResult.participant?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {scanResult.type === "conflict" && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">CẢNH BÁO: VÉ ĐÃ SỬ DỤNG</span>
                    <p className="text-xs font-medium text-amber-900 mt-1">{scanResult.message}</p>
                  </div>
                </div>
              )}

              {scanResult.type === "error" && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-red-800">CHECK-IN THẤT BẠI</span>
                    <p className="text-xs font-medium text-red-900 mt-1">{scanResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Khung quét Camera thực tế */}
          <div className="flex flex-col items-center space-y-2 w-full">
            <div
              id="qr-reader-container"
              className="w-full max-w-[340px] aspect-square bg-black rounded-3xl overflow-hidden shadow-inner border-2 border-purple-300 flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />
            {submitting && (
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 animate-pulse mt-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý điểm danh...
              </div>
            )}
          </div>
          {/* Form nhập tay */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCheckinSubmit();
            }}
            className="space-y-3 pt-2 border-t border-gray-100"
          >
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Hoặc nhập mã Token / Manual Code
            </label>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value)}
                  placeholder="Nhập mã QR token hoặc mã số..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-600 focus:bg-white rounded-2xl text-xs font-mono font-bold text-gray-900 transition outline-none"
                  disabled={submitting}
                />
                <QrCode className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
              <button
                type="submit"
                disabled={submitting || !qrCodeInput.trim()}
                className="py-3 px-5 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-2xl transition shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check-in"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-medium">UniEvent Scanner</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}