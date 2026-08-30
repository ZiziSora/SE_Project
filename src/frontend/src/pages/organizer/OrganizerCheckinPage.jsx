import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  QrCode,
  Search,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import OrganizerHeader from "../../components/common/OrganizerHeader.jsx";
import QRScannerModal from "../../components/checkin/QRScannerModal.jsx";
import { getEventCheckinStats, manualCheckin } from "../../api/checkinApi.js";
import { toast } from "react-toastify";

export default function OrganizerCheckinPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'CHECKED_IN' | 'REGISTERED'
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Manual Check-in by MSSV states
  const [mssvInput, setMssvInput] = useState("");
  const [mssvSubmitting, setMssvSubmitting] = useState(false);
  const [mssvResult, setMssvResult] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getEventCheckinStats(eventId);
      setStatsData(data);
    } catch (err) {
      console.error("Lỗi khi tải thông tin điểm danh:", err);
      setError(
        err.response?.data?.detail ||
          "Không thể tải danh sách điểm danh. Vui lòng kiểm tra quyền truy cập."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    let isMounted = true;
    if (!eventId) return;

    getEventCheckinStats(eventId)
      .then((data) => {
        if (isMounted) {
          setStatsData(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Lỗi khi tải thông tin điểm danh:", err);
          setError(
            err.response?.data?.detail ||
              "Không thể tải danh sách điểm danh. Vui lòng kiểm tra quyền truy cập."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const handleDirectMssvCheckin = async (e) => {
    if (e) e.preventDefault();
    const cleanMssv = mssvInput.trim();
    if (!cleanMssv) return;

    try {
      setMssvSubmitting(true);
      setMssvResult(null);
      const res = await manualCheckin({
        eventId,
        studentCode: cleanMssv,
        code: cleanMssv,
      });

      setMssvResult({
        type: "success",
        participant: res.participant,
        checked_in_at: res.checked_in_at,
      });
      toast.success(`Đã điểm danh thành công cho ${res.participant?.full_name || cleanMssv}!`);
      setMssvInput("");
      fetchStats();
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Không thể điểm danh cho sinh viên này.";
      setMssvResult({
        type: "error",
        message: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setMssvSubmitting(false);
    }
  };

  const handleManualRowCheckin = async (participant) => {
    try {
      setActionLoadingId(participant.registration_id);
      await manualCheckin({
        eventId,
        registrationId: participant.registration_id,
        studentCode: participant.student_code,
        code: participant.email || participant.student_code,
      });

      toast.success(`Đã điểm danh thành công cho ${participant.full_name || participant.email}!`);
      fetchStats();
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Không thể thực hiện điểm danh thủ công."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const participants = (statsData?.participants || []).filter(
    (item) => item.registration_status !== "WAITLISTED" && item.registration_status !== "WAITLIST"
  );

  const filteredParticipants = participants.filter((item) => {
    const isCheckedIn = item.registration_status === "CHECKED_IN";
    if (statusFilter === "CHECKED_IN" && !isCheckedIn) return false;
    if (statusFilter === "REGISTERED" && isCheckedIn) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = item.full_name?.toLowerCase().includes(query);
    const emailMatch = item.email?.toLowerCase().includes(query);
    const codeMatch = item.student_code?.toLowerCase().includes(query);

    return nameMatch || emailMatch || codeMatch;
  });

  const totalRegistered = participants.length;
  const totalCheckedIn = statsData?.total_checked_in || 0;
  const percentage =
    totalRegistered > 0
      ? Math.round((totalCheckedIn / totalRegistered) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 font-sans">
      <OrganizerHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation back */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-purple-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại quản lý người tham gia
          </button>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-purple-300 text-xs font-semibold text-gray-700 rounded-xl transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
            Làm mới dữ liệu
          </button>
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-sm font-medium">Đang tải danh sách check-in...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-8 text-center max-w-lg mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Không thể tải trang</h3>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-4 px-5 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* Top Banner Stats */}
            <div className="bg-gradient-to-r from-gray-900 via-purple-950 to-indigo-950 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="inline-block bg-purple-500/20 text-purple-200 border border-purple-400/30 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                    Quản lý điểm danh Real-time
                  </span>
                  <h1 className="text-2xl md:text-3xl font-black text-white leading-snug">
                    {statsData?.title || "Sự kiện UniEvent"}
                  </h1>
                  <p className="text-xs text-purple-200/80 mt-1 max-w-xl">
                    Nhập mã số sinh viên (MSSV) để check-in thủ công nhanh chóng hoặc dùng máy quét mã QR từ camera.
                  </p>
                </div>

                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-sm rounded-2xl shadow-lg transition transform active:scale-98 flex items-center justify-center gap-2.5 shrink-0 cursor-pointer"
                >
                  <QrCode className="w-5 h-5 text-gray-950" />
                  Mở Trình Quét mã QR Check-in
                </button>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10 relative z-10">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
                  <span className="text-xs text-purple-200 font-medium block">
                    Đã đăng ký tham gia
                  </span>
                  <span className="text-2xl font-black text-white mt-1 block">
                    {totalRegistered}{" "}
                    {statsData?.capacity && (
                      <span className="text-xs font-normal text-purple-300">
                        / {statsData.capacity} chỗ
                      </span>
                    )}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
                  <span className="text-xs text-emerald-300 font-medium block">
                    Đã điểm danh (Check-in)
                  </span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">
                    {totalCheckedIn}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
                  <span className="text-xs text-purple-200 font-medium block">
                    Tỷ lệ điểm danh
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-black text-white">
                      {percentage}%
                    </span>
                    <div className="flex-1 bg-white/10 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Check-in Card (MSSV) */}
            <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-purple-700" />
                    Điểm danh thủ công bằng Mã số sinh viên (MSSV)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Nhập MSSV của sinh viên đến tham dự. Hệ thống sẽ ghi nhận thời gian check-in ngay tại mốc thời điểm này.
                  </p>
                </div>
              </div>

              <form onSubmit={handleDirectMssvCheckin} className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={mssvInput}
                    onChange={(e) => setMssvInput(e.target.value)}
                    placeholder="Nhập Mã số sinh viên (ví dụ: 21110001)..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-600 focus:bg-white rounded-2xl text-xs font-mono font-bold text-gray-900 transition outline-none"
                    disabled={mssvSubmitting}
                  />
                  <UserCheck className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                </div>

                <button
                  type="submit"
                  disabled={mssvSubmitting || !mssvInput.trim()}
                  className="px-6 py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {mssvSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Điểm danh ngay"
                  )}
                </button>
              </form>

              {mssvResult && (
                <div className="mt-4 animate-in fade-in duration-200">
                  {mssvResult.type === "success" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-emerald-950">
                            {mssvResult.participant?.full_name || mssvResult.participant?.email} (MSSV: {mssvResult.participant?.student_code || "N/A"})
                          </p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Check-in thành công lúc {new Date(mssvResult.checked_in_at).toLocaleTimeString("vi-VN")} ngày {new Date(mssvResult.checked_in_at).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setMssvResult(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 cursor-pointer">
                        Đóng
                      </button>
                    </div>
                  )}
                  {mssvResult.type === "error" && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs text-red-900">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                        <p className="font-medium text-red-900">{mssvResult.message}</p>
                      </div>
                      <button onClick={() => setMssvResult(null)} className="text-red-700 hover:text-red-900 text-xs font-bold px-2 py-1 cursor-pointer">
                        Đóng
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email, MSSV..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-purple-600 focus:bg-white rounded-xl text-xs font-medium text-gray-900 transition outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === "ALL"
                      ? "bg-purple-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Tất cả ({participants.length})
                </button>
                <button
                  onClick={() => setStatusFilter("CHECKED_IN")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === "CHECKED_IN"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Đã Check-in ({totalCheckedIn})
                </button>
                <button
                  onClick={() => setStatusFilter("REGISTERED")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === "REGISTERED"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Chưa Check-in ({totalRegistered - totalCheckedIn})
                </button>
              </div>
            </div>

            {/* Participants Table */}
            <div className="bg-white border border-gray-100 rounded-3xl shadow-xs overflow-hidden">
              {filteredParticipants.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">
                    Không tìm thấy sinh viên phù hợp
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                        <th className="py-3.5 px-6">Sinh viên / Người tham dự</th>
                        <th className="py-3.5 px-4">MSSV</th>
                        <th className="py-3.5 px-4">Thời gian đăng ký</th>
                        <th className="py-3.5 px-4">Trạng thái Check-in</th>
                        <th className="py-3.5 px-6 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                      {filteredParticipants.map((item) => {
                        const isCheckedIn =
                          item.registration_status === "CHECKED_IN";
                        return (
                          <tr
                            key={item.registration_id}
                            className="hover:bg-purple-50/30 transition"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 uppercase text-xs">
                                  {(item.full_name || item.email)[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-xs">
                                    {item.full_name || "Sinh viên"}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    {item.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4 font-mono font-bold text-gray-800">
                              {item.student_code || "Chưa cập nhật"}
                            </td>

                            <td className="py-4 px-4 text-gray-500">
                              {new Date(item.created_at).toLocaleDateString("vi-VN")}
                            </td>

                            <td className="py-4 px-4">
                              {isCheckedIn ? (
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Đã check-in{" "}
                                  {item.checked_in_at && (
                                    <span className="text-[10px] text-emerald-600 font-normal">
                                      (
                                      {new Date(
                                        item.checked_in_at
                                      ).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      )
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                                  Chưa điểm danh
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-6 text-right">
                              {isCheckedIn ? (
                                <span className="text-[11px] text-gray-400 font-medium">
                                  Đã hoàn tất
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleManualRowCheckin(item)}
                                  disabled={actionLoadingId === item.registration_id}
                                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold rounded-xl shadow-2xs transition active:scale-95 disabled:opacity-50"
                                >
                                  {actionLoadingId === item.registration_id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    "Điểm danh"
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Check-in Scanner Modal */}
      <QRScannerModal
        eventId={eventId}
        eventTitle={statsData?.title}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccessCheckin={fetchStats}
      />
    </div>
  );
}
