import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CircleCheck, QrCode, UsersRound } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import ParticipantFilterBar from "../components/Participants/ParticipantFilterBar.jsx";
import ParticipantStatCard from "../components/Participants/ParticipantStatCard.jsx";
import ParticipantTable from "../components/Participants/ParticipantTable.jsx";
import OrganizerHeader from "../components/common/OrganizerHeader.jsx";
import { participantsApi } from "../api/participantApi.js";

const PAGE_SIZE = 8;

const EMPTY_SUMMARY = { total: 0, checked_in: 0, not_checked_in: 0 };

/** Trang danh sách người tham gia của một sự kiện. */
export default function ParticipantDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [participants, setParticipants] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingId, setCheckingId] = useState(null);

  // Thông tin sự kiện + số liệu tổng quan: chỉ tải lại khi đổi sự kiện
  const loadHeader = useCallback(async () => {
    try {
      const [eventResult, summaryResult] = await Promise.all([
        participantsApi.getEvent(eventId),
        participantsApi.summary(eventId),
      ]);
      setEvent(eventResult);
      setSummary(summaryResult);
    } catch (err) {
      console.error("Lỗi tải thông tin sự kiện:", err);
      toast.error("Không tải được thông tin sự kiện.");
    }
  }, [eventId]);

  useEffect(() => {
    let isSubscribed = true;
    Promise.all([
      participantsApi.getEvent(eventId),
      participantsApi.summary(eventId),
    ])
      .then(([eventResult, summaryResult]) => {
        if (isSubscribed) {
          setEvent(eventResult);
          setSummary(summaryResult);
        }
      })
      .catch((err) => {
        console.error("Lỗi tải thông tin sự kiện:", err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [eventId]);

  // Danh sách người tham gia: tải lại khi đổi bộ lọc / từ khoá / trang
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await participantsApi.list(eventId, {
          status: activeFilter,
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        setParticipants(result.items);
        setTotal(result.total);
        setTotalPages(result.total_pages);
      } catch (err) {
        console.error("Lỗi tải danh sách người tham gia:", err);
        if (!cancelled) setError("Không tải được danh sách người tham gia. Vui lòng thử lại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eventId, activeFilter, search, page]);

  const handleCheckIn = async (participant) => {
    setCheckingId(participant.registration_id);
    try {
      const targetCode = participant.student_code || participant.email || participant.registration_id;
      const result = await participantsApi.checkIn(eventId, targetCode, participant.registration_id);

      // Cập nhật ngay trên giao diện để tránh phải chờ tải lại toàn bộ bảng
      setParticipants((previous) =>
        previous.map((item) =>
          item.registration_id === participant.registration_id
            ? { ...item, checked_in_at: result.checked_in_at ?? new Date().toISOString(), registration_status: "CHECKED_IN" }
            : item,
        ),
      );
      setSummary((previous) => ({
        ...previous,
        checked_in: previous.checked_in + 1,
        not_checked_in: Math.max(0, previous.not_checked_in - 1),
      }));
      loadHeader();
      toast.success(`Đã điểm danh cho ${participant.full_name || participant.email}`);
    } catch (err) {
      console.error("Lỗi điểm danh:", err);
      toast.error(err.response?.data?.detail || "Không điểm danh được. Vui lòng thử lại.");
    } finally {
      setCheckingId(null);
    }
  };

  const handleFilterChange = (filterKey) => {
    setActiveFilter(filterKey);
    setPage(1); // Về trang 1 khi đổi bộ lọc
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1); // Về trang 1 khi tìm kiếm
  };

  return (
    <div className="min-h-screen w-full bg-background">
      <OrganizerHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <header>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground">
              {event?.title ?? "Đang tải sự kiện..."}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Quản lý người tham gia</p>
          </header>

          {(event?.event_status || event?.status || "").toUpperCase() !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => navigate(`/organizer/events/${eventId}/checkin`)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 px-5 py-3 font-mono text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors"
            >
              <QrCode className="size-4" aria-hidden="true" />
              Trang Điểm danh & Quét QR
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <ParticipantStatCard
            label="Tổng đăng ký"
            value={summary.total}
            icon={UsersRound}
            tone="violet"
          />
          <ParticipantStatCard
            label="Đã điểm danh"
            value={summary.checked_in}
            icon={CircleCheck}
            tone="teal"
          />
          <ParticipantStatCard
            label="Chưa điểm danh"
            value={summary.not_checked_in}
            icon={CalendarClock}
            tone="red"
          />
        </div>

        <div className="mt-6">
          <ParticipantFilterBar
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            counts={{
              all: summary.total,
              checked_in: summary.checked_in,
              not_checked_in: summary.not_checked_in,
            }}
            search={search}
            onSearchChange={handleSearchChange}
          />
        </div>

        <div className="mt-4">
          <ParticipantTable
            participants={participants}
            loading={loading}
            error={error}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            totalPages={totalPages}
            onPageChange={setPage}
            onCheckIn={handleCheckIn}
            checkingId={checkingId}
          />
        </div>
      </main>
    </div>
  );
}
