import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import ParticipantEventCard from "../components/Participants/ParticipantEventCard.jsx";
import OrganizerHeader from "../components/common/OrganizerHeader.jsx";
import { participantsApi } from "../api/participantApi.js";

/** Trang chọn sự kiện trước khi vào quản lý người tham gia. */
export default function ParticipantEventsPage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMock, setIsMock] = useState(false);

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
        setIsMock(result.is_mock);
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
            {isMock && (
              <p className="mt-2 inline-flex rounded-md bg-yellow-100 px-2.5 py-1 font-mono text-xs font-medium text-yellow-700">
                Đang hiển thị dữ liệu mẫu — API chưa sẵn sàng
              </p>
            )}
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

        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải danh sách sự kiện...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không tìm thấy sự kiện nào phù hợp.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <ParticipantEventCard key={event.event_id} event={event} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
