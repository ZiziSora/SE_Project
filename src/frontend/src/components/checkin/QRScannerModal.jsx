import { useState, useRef, useEffect, useCallback } from "react";
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
  Camera,
  RefreshCw,
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

  // Camera states
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const playSuccessSound = useCallback(() => {
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
      // Ignore audio errors
    }
  }, [soundEnabled]);

  const handleCheckinSubmit = useCallback(
    async (codeToSubmit) => {
      const cleanCode = (codeToSubmit || qrCodeInput).trim();
      if (!cleanCode || isProcessingRef.current) return;

      try {
        isProcessingRef.current = true;
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
        // Cooldown 2.5s trước khi cho phép quét tiếp mã mới
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2500);
      }
    },
    [eventId, qrCodeInput, playSuccessSound, onSuccessCheckin]
  );

  const handleCheckinRef = useRef(handleCheckinSubmit);
  useEffect(() => {
    handleCheckinRef.current = handleCheckinSubmit;
  }, [handleCheckinSubmit]);

  // Safe camera stop
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn("Lỗi khi hủy scanner camera:", e);
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  // Khởi tạo quét camera bằng Html5Qrcode
  const startScanner = useCallback(async () => {
    await stopScanner();
    // Chờ 1 tick nhỏ trước khi set state để không vi phạm set-state-in-effect
    await new Promise((resolve) => setTimeout(resolve, 50));
    setCameraError(null);
    setCameraLoading(true);

    try {
      // Đợi DOM gắn container
      await new Promise((resolve) => setTimeout(resolve, 200));

      const qrContainer = document.getElementById("qr-reader-container");
      if (!qrContainer) {
        setCameraLoading(false);
        return;
      }
      qrContainer.innerHTML = "";

      const html5QrCode = new Html5Qrcode("qr-reader-container");
      scannerRef.current = html5QrCode;

      // Xác định camera
      let cameraConfig;
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
          if (selectedCameraId) {
            cameraConfig = selectedCameraId;
          } else {
            const backCam = cameras.find((cam) =>
              /back|rear|environment|sau/i.test(cam.label)
            );
            cameraConfig = backCam ? backCam.id : cameras[0].id;
            setSelectedCameraId(cameraConfig);
          }
        } else {
          cameraConfig = { facingMode: "environment" };
        }
      } catch {
        cameraConfig = { facingMode: "environment" };
      }

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(160, Math.floor(minEdge * 0.75));
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      };

      const onSuccess = (decodedText) => {
        if (!isProcessingRef.current && handleCheckinRef.current) {
          handleCheckinRef.current(decodedText);
        }
      };

      const onError = () => {
        // Bỏ qua các frame chưa nhận diện mã
      };

      try {
        await html5QrCode.start(cameraConfig, config, onSuccess, onError);
      } catch (firstErr) {
        console.warn("Thử camera đầu tiên thất bại, thử lại camera mặc định:", firstErr);
        // Fallback thử với constraint facingMode user/environment
        try {
          await html5QrCode.start({ facingMode: "user" }, config, onSuccess, onError);
        } catch {
          await html5QrCode.start({ facingMode: "environment" }, config, onSuccess, onError);
        }
      }
    } catch (err) {
      console.error("Không thể bật camera quét QR:", err);
      setCameraError(
        "Không thể bật camera. Vui lòng cấp quyền camera trong trình duyệt hoặc thử lại."
      );
    } finally {
      setCameraLoading(false);
    }
  }, [selectedCameraId, stopScanner]);

  useEffect(() => {
    let isSubscribed = true;

    if (isOpen) {
      const timer = setTimeout(() => {
        if (isSubscribed) {
          startScanner();
        }
      }, 0);

      return () => {
        isSubscribed = false;
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }

    return () => {
      isSubscribed = false;
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  // Xử lý đổi camera
  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      {/* CSS fix cho html5-qrcode container */}
      <style>{`
        #qr-reader-container {
          border: none !important;
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #000 !important;
          overflow: hidden !important;
        }
        #qr-reader-container video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1.0rem !important;
        }
        #qr-canvas-visible {
          display: none !important;
        }
        #qr-reader-container #qr-shaded-region {
          border-radius: 1.0rem !important;
        }
        #qr-reader-container img[alt="Info icon"],
        #qr-reader-container span[style*="opacity: 0.6"] {
          display: none !important;
        }
      `}</style>

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
              title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh điểm danh"}
              className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
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
                          <p>
                            <span className="font-semibold">MSSV:</span>{" "}
                            {scanResult.participant.student_code}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">Email:</span>{" "}
                          {scanResult.participant?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {scanResult.type === "conflict" && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                      CẢNH BÁO: VÉ ĐÃ SỬ DỤNG
                    </span>
                    <p className="text-xs font-medium text-amber-900 mt-1">
                      {scanResult.message}
                    </p>
                  </div>
                </div>
              )}

              {scanResult.type === "error" && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-red-800">
                      CHECK-IN THẤT BẠI
                    </span>
                    <p className="text-xs font-medium text-red-900 mt-1">
                      {scanResult.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Khung Camera Quét Mã */}
          <div className="flex flex-col items-center justify-center space-y-3 w-full">
            <div className="w-[300px] h-[300px] rounded-3xl overflow-hidden shadow-inner border-2 border-purple-300 bg-black flex items-center justify-center relative">
              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-10 p-4 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-2" />
                  <p className="text-xs font-medium text-purple-200">Đang bật Camera...</p>
                </div>
              )}

              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-10 p-5 text-center">
                  <Camera className="w-10 h-10 text-red-400 mb-2" />
                  <p className="text-xs text-red-200 mb-3">{cameraError}</p>
                  <button
                    onClick={startScanner}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                  </button>
                </div>
              ) : null}

              <div id="qr-reader-container" className="w-full h-full" />
            </div>

            {/* Selector chọn Camera (nếu có nhiều camera) */}
            {availableCameras.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Camera className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-medium">Camera:</span>
                <select
                  value={selectedCameraId}
                  onChange={handleCameraChange}
                  className="bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800 font-semibold focus:outline-none focus:border-purple-600"
                >
                  {availableCameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Camera ${cam.id.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {submitting && (
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 animate-pulse mt-1">
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
              Hoặc nhập MSSV / Mã QR Token / Code
            </label>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value)}
                  placeholder="Nhập MSSV (ví dụ 21110001), mã QR token hoặc mã số..."
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
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Check-in"
                )}
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