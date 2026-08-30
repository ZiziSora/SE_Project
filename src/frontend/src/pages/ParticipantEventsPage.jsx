import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import ParticipantEventCard from "../components/Participants/ParticipantEventCard.jsx";
import OrganizerHeader from "../components/common/OrganizerHeader.jsx";
import { participantsApi } from "../api/participantApi.js";
import {
  PARTICIPANT_EVENT_FILTERS,
  getParticipantEventGroup,
} from "../utils/participantUtils.js";

/** Trang chọn sự kiện trước khi vào quản lý người tham gia. */
export default function ParticipantEventsPage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeGroup, setActiveGroup] = useState("ALL");

  useEffect(() => {
    let cancelled = false;

    // Debounce ô tìm kiếm để không gọi API sau mỗi lần gõ phím
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await participantsApi.listEvents({ search: search || undefined });
        if (cancelled) return;
        setEvents(result.items);
      } catch (err) {
        console.error("Lỗi tải danh sách sự kiện:", err);
        if (!cancelled) setError("Không tải được danh sách sự kiện. Vui lòng thử lại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  // Chỉ giữ sự kiện đã công khai: bản nháp / chờ duyệt lần đầu chưa có ai đăng
  // ký, sự kiện đã huỷ thì không còn gì để quản lý.
  const groupedEvents = useMemo(
    () =>
      events
        .map((event) => ({ event, group: getParticipantEventGroup(event) }))
        .filter((item) => item.group !== null),
    [events],
  );

  const visibleEvents = useMemo(
    () =>
      activeGroup === "ALL"
        ? groupedEvents
        : groupedEvents.filter((item) => item.group.key === activeGroup),
    [groupedEvents, activeGroup],
  );

  const countByGroup = useMemo(() => {
    const counts = { ALL: groupedEvents.length };
    for (const item of groupedEvents) {
      counts[item.group.key] = (counts[item.group.key] || 0) + 1;
    }
    return counts;
  }, [groupedEvents]);

  return (
    <div className="min-h-screen w-full bg-background">
      <OrganizerHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <header>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground">
              Quản lý Người tham gia
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vui lòng chọn một sự kiện để tiếp tục.
            </p>
          </header>

          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm sự kiện..."
              aria-label="Tìm kiếm sự kiện"
              className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {!loading && !error && groupedEvents.length > 0 && (
          <div
            className="mt-6 flex flex-wrap gap-2"
            role="group"
            aria-label="Lọc sự kiện theo trạng thái"
          >
            {PARTICIPANT_EVENT_FILTERS.map((filter) => {
              const count = countByGroup[filter.key] || 0;
              const isActive = activeGroup === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveGroup(filter.key)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {filter.label}
                  <span
                    className={`ml-1.5 text-xs font-bold ${
                      isActive ? "text-primary-foreground/80" : "text-foreground/50"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải danh sách sự kiện...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : visibleEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không tìm thấy sự kiện nào phù hợp.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleEvents.map(({ event, group }) => (
                <ParticipantEventCard
                  key={event.event_id}
                  event={event}
                  group={group}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
