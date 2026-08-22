import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import {
  getOrganizerRequests,
  reviewOrganizerRequest,
} from "../../api/organizerRequestApi.js";
import AdminHeader from "../../components/common/AdminHeader.jsx";
import ConfirmActionDialog from "../../components/ReviewOrganizerRequest/ConfirmActionDialog.jsx";
import EvidenceDialog from "../../components/ReviewOrganizerRequest/EvidenceDialog.jsx";
import StatStrip from "../../components/ReviewOrganizerRequest/StatStrip.jsx";
import StatusBadge from "../../components/ReviewOrganizerRequest/StatusBadge.jsx";
import SubmittedTime from "../../components/ReviewOrganizerRequest/SubmittedTime.jsx";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";

const PAGE_SIZE = 3;
const EMPTY_SUMMARY = { total: 0, pending: 0, approved: 0, rejected: 0 };

function getApiErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return (
      detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(" ") || fallback
    );
  }
  return fallback;
}

export default function ReviewOrganizerRequest() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(searchTerm.trim());
      setIsLoading(true);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    let isCancelled = false;

    getOrganizerRequests({
      page: currentPage,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
    })
      .then((data) => {
        if (isCancelled) return;
        setRequests(data.items);
        setSummary(data.summary);
        setTotal(data.total);
        setTotalPages(data.total_pages);
        setErrorMessage("");
      })
      .catch((error) => {
        if (isCancelled) return;
        setRequests([]);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải danh sách yêu cầu."),
        );
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, debouncedSearch, refreshKey]);

  const pageCount = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const displayStart = requests.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const displayEnd = requests.length ? displayStart + requests.length - 1 : 0;

  const handlePageChange = (nextPage) => {
    setIsLoading(true);
    setCurrentPage(nextPage);
  };

  const retryLoading = () => {
    setIsLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const confirmRequestAction = async () => {
    if (!pendingAction || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await reviewOrganizerRequest(
        pendingAction.request.id,
        pendingAction.status,
      );
      toast.success(result.message);
      setPendingAction(null);
      setIsLoading(true);
      setCurrentPage(1);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Không thể cập nhật yêu cầu. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8f9ff] font-['Inter'] text-[#0b1c30]">
      <AdminHeader />

      <main className="relative mx-auto w-full max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-16">
        <div
          className="pointer-events-none absolute -right-36 top-0 -z-0 size-[430px] rounded-full bg-[#d9c5ff]/25 blur-[110px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-48 top-[360px] -z-0 size-[360px] rounded-full bg-[#cbe8f7]/20 blur-[100px]"
          aria-hidden="true"
        />

        <section className="review-reveal relative z-10 grid items-end gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div>
            <h1 className="max-w-4xl font-['Manrope'] text-[clamp(2.25rem,4.4vw,4rem)] font-bold leading-[1.06] tracking-[-0.055em] text-[#152033]">
              Xét duyệt Ban tổ chức
            </h1>
            <p className="mt-4 max-w-2xl text-[clamp(1rem,1.5vw,1.125rem)] leading-7 text-[#62596d]">
              Kiểm tra danh tính và minh chứng để trao quyền tổ chức sự kiện một
              cách an toàn, minh bạch.
            </p>
          </div>
          <aside className="border-l-2 border-[#7c3aed] pl-5 lg:mb-1 lg:justify-self-end lg:max-w-[330px]">
            <p className="text-sm leading-6 text-[#6b6275]">
              Mỗi quyết định đều cần được xác nhận hai bước. Hồ sơ đã xử lý sẽ
              được cập nhật trạng thái ngay trong danh sách.
            </p>
          </aside>
        </section>

        <div className="relative z-10 mt-10">
          <StatStrip
            totalRequests={summary.total}
            pendingRequests={summary.pending}
            processedRequests={summary.approved + summary.rejected}
          />
        </div>

        <section
          className="review-reveal relative z-10 mt-8 overflow-hidden rounded-2xl border border-[#ded7e7] bg-white shadow-[0_22px_65px_rgba(44,29,59,0.08)]"
          style={{ animationDelay: "180ms" }}
          aria-labelledby="request-list-title"
        >
          <div className="flex flex-col gap-5 border-b border-[#e7e1ec] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2
                  id="request-list-title"
                  className="font-['Manrope'] text-xl font-bold tracking-[-0.025em] text-[#172235]"
                >
                  Hàng đợi xét duyệt
                </h2>
                <span className="rounded-full bg-[#eee7ff] px-2.5 py-1 text-xs font-semibold text-[#6d20df]">
                  {summary.pending}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#7a7183]">
                Ưu tiên kiểm tra hồ sơ và tài liệu minh chứng.
              </p>
            </div>

            <label className="relative block w-full lg:w-[360px]">
              <span className="sr-only">Tìm kiếm người dùng</span>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#83798d]"
                strokeWidth={2}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                maxLength={200}
                placeholder="Tìm theo tên, email hoặc đơn vị"
                className="h-11 w-full rounded-xl border border-[#dcd4e3] bg-[#fbfaff] pl-11 pr-10 text-sm text-[#302839] outline-none transition-all duration-200 placeholder:text-[#aaa1b2] focus:border-[#9b71db] focus:bg-white focus:ring-3 focus:ring-[#7c3aed]/10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-[#918797] hover:bg-[#eee9f2] hover:text-[#5b5163]"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] table-fixed border-collapse text-center">
              <thead className="bg-[#f6f4f8] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#746a7e]">
                <tr className="h-12">
                  <th className="w-[24%] px-6 font-semibold">Người đăng ký</th>
                  <th className="w-[20%] px-4 font-semibold">Địa chỉ email</th>
                  <th className="w-[13%] px-4 font-semibold">Thời gian gửi</th>
                  <th className="w-[14%] px-4 font-semibold">Trạng thái</th>
                  <th className="w-[12%] px-4 font-semibold">Minh chứng</th>
                  <th className="w-[17%] px-6 font-semibold">Quyết định</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9e4ed]">
                {!isLoading &&
                  !errorMessage &&
                  requests.map((request) => (
                    <tr
                      key={request.id}
                      className="group h-[86px] text-sm text-[#5d5566] transition-colors duration-200 hover:bg-[#fcfaff]"
                    >
                      <td className="px-6">
                        <div className="flex items-center justify-start gap-3">
                          <span
                            className={`grid size-10 shrink-0 place-items-center rounded-[13px] text-xs font-bold shadow-[inset_0_0_0_1px_rgba(20,15,25,0.04)] transition-transform duration-500 ease-out group-hover:scale-105 ${request.avatarClass}`}
                          >
                            {request.initials}
                          </span>
                          <div className="min-w-0 text-left">
                            <p className="truncate font-semibold text-[#172235]">
                              {request.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#8a8192]">
                              {request.organization}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="truncate px-4 text-center text-[13px]">
                        {request.email}
                      </td>
                      <td className="px-4">
                        <SubmittedTime value={request.submittedAt} />
                      </td>
                      <td className="px-4">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 font-semibold text-[#6d20df] transition-colors hover:bg-[#eee7ff]"
                        >
                          <FileCheck2
                            className="size-4"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                          Xem hồ sơ
                        </button>
                      </td>
                      <td className="px-6">
                        {request.status === "pending" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  request,
                                  status: "approved",
                                })
                              }
                              className="inline-flex h-9 min-w-[92px] items-center justify-center gap-1.5 rounded-[10px] bg-[#6d20df] px-3 text-xs font-semibold text-white shadow-[0_7px_17px_rgba(109,32,223,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5915bd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d20df]"
                            >
                              <Check
                                className="size-3.5"
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              Chấp nhận
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  request,
                                  status: "rejected",
                                })
                              }
                              className="inline-flex h-9 min-w-[82px] items-center justify-center gap-1.5 rounded-[10px] border border-[#d9b7b7] bg-white px-3 text-xs font-semibold text-[#a03636] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c84b4b] hover:bg-[#fff5f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c84b4b]"
                            >
                              <X
                                className="size-3.5"
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="block text-center text-xs font-medium text-[#8a8192]">
                            Đã hoàn tất
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                {isLoading && (
                  <tr>
                    <td
                      colSpan="6"
                      className="h-44 px-6 text-center text-sm text-[#6b6275]"
                    >
                      <LoaderCircle
                        className="mx-auto size-7 animate-spin text-[#7c3aed]"
                        aria-hidden="true"
                      />
                      <p className="mt-3 font-semibold">
                        Đang tải danh sách yêu cầu...
                      </p>
                    </td>
                  </tr>
                )}

                {!isLoading && errorMessage && (
                  <tr>
                    <td colSpan="6" className="h-44 px-6 text-center">
                      <p className="text-sm font-semibold text-[#8f3030]">
                        {errorMessage}
                      </p>
                      <button
                        type="button"
                        onClick={retryLoading}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d8d0df] px-3 py-2 text-xs font-semibold text-[#51495a] hover:bg-[#f7f4fa]"
                      >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        Thử lại
                      </button>
                    </td>
                  </tr>
                )}

                {!isLoading && !errorMessage && requests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="h-44 px-6 text-center">
                      <Search
                        className="mx-auto size-7 text-[#b4aaba]"
                        strokeWidth={1.6}
                      />
                      <p className="mt-3 text-sm font-semibold text-[#51495a]">
                        Không tìm thấy hồ sơ
                      </p>
                      <p className="mt-1 text-xs text-[#8a8192]">
                        Thử tìm kiếm bằng tên hoặc email khác.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex min-h-[68px] flex-col items-start justify-between gap-3 border-t border-[#e7e1ec] bg-[#fbfaff] px-5 py-4 text-sm text-[#6b6275] sm:flex-row sm:items-center sm:px-6">
            <p>
              Hiển thị{" "}
              <strong className="font-semibold text-[#302839]">
                {displayStart}–{displayEnd}
              </strong>{" "}
              trong{" "}
              <strong className="font-semibold text-[#302839]">{total}</strong>{" "}
              yêu cầu
            </p>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                disabled={safeCurrentPage === 1 || isLoading}
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#d8d0df] bg-white px-3 text-xs font-semibold text-[#51495a] transition-all hover:border-[#b9aac7] hover:bg-[#f7f4fa] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Trước
              </button>
              <span className="grid size-9 place-items-center rounded-[10px] bg-[#1e293b] text-xs font-semibold text-white">
                {safeCurrentPage}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= pageCount || isLoading}
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#d8d0df] bg-white px-3 text-xs font-semibold text-[#51495a] transition-all hover:border-[#b9aac7] hover:bg-[#f7f4fa] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Sau
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </footer>
        </section>
      </main>

      <EvidenceDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
      <ConfirmActionDialog
        action={pendingAction}
        isSubmitting={isSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmRequestAction}
      />
    </div>
  );
}
