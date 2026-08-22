import { useState, useEffect } from "react";
import StudentHeader from "../components/common/StudentHeader.jsx";
import FilterBar from "../components/FilterBar";
import EventCard from "../components/EventCard";
import FloatingChatbox from "../components/FloatingChatbox";

export default function ExploreEventsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("Tất cả");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [sortOption, setSortOption] = useState("Mới nhất");

  const [events, setEvents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const featuredEvents = events.slice(0, 3);

  // Gọi API lấy dữ liệu từ FastAPI mỗi khi bộ lọc thay đổi
  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search_term", searchTerm);
        if (selectedFaculty) params.append("faculty", selectedFaculty);
        if (selectedCategory) params.append("category", selectedCategory);
        if (sortOption) params.append("sort_by", sortOption);

        params.append("page", currentPage);
        params.append("limit", 12);

        const res = await fetch(
          `http://127.0.0.1:8000/api/events?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (!res.ok) return;
        const data = await res.json();

        if (data && data.events) {
          setEvents(data.events);
          setTotalPages(data.total_pages || 1);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Không thể kết nối đến Backend API:", err);
      }
    }

    fetchEvents();
    return () => controller.abort();
  }, [searchTerm, selectedFaculty, selectedCategory, sortOption, currentPage]);

  return (
    <div className="min-h-screen bg-white font-sans">
      <StudentHeader />
      <main className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-7 max-w-5xl">
        <section id="hero-title" className="space-y-2 pt-1">
          <h1
            className="text-2xl sm:text-3xl font-extrabold leading-tight"
            style={{ color: "#7C3AED" }}
          >
            Cập nhật sự kiện toàn trường
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
            Theo dõi và quản lý các hoạt động học thuật, hội thảo, và phong trào
            đang diễn ra tại các khoa và câu lạc bộ. Nắm bắt thông tin để điều
            phối hiệu quả.
          </p>
        </section>

        {/* Khối "Gợi ý cho bạn" */}
        <section
          id="featured-events"
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background:
              "linear-gradient(135deg, #F8F1FF 0%, #CCC3D8 20%, #7C3AED 55%, #630ED4 100%)",
            border: "1px solid rgba(255,255,255,0.20)",
            boxShadow: "0 4px 32px 0 rgba(99,14,212,0.18)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm">✨</span>
            <h2 className="text-sm font-bold text-white">Gợi ý cho bạn</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {featuredEvents.length > 0 ? (
              featuredEvents.map((event) => (
                <EventCard
                  key={event.event_id || event.id}
                  eventId={event.event_id || event.id}
                  image={event.banner_url}
                  badgeText="Gợi ý"
                  title={event.title}
                  faculty={event.department_name || "Đơn vị tổ chức"}
                  date={`${event.start_time || ""}`}
                  location={event.location}
                  isFeatured
                />
              ))
            ) : (
              <p className="col-span-full py-6 text-center text-sm font-medium text-white/80">
                Chưa có sự kiện phù hợp để gợi ý.
              </p>
            )}
          </div>
        </section>

        {/* Thanh lọc */}
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedFaculty={selectedFaculty}
          setSelectedFaculty={setSelectedFaculty}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          sortOption={sortOption}
          setSortOption={setSortOption}
        />

        {/* Danh sách sự kiện thực tế từ Database */}
        <section
          id="all-events"
          className="rounded-2xl p-4 sm:p-5 bg-white"
          style={{
            border: "1.5px solid #E5E7EB",
            boxShadow: "0 1px 8px 0 rgba(0,0,0,0.06)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {events.length > 0 ? (
              events.map((event) => (
                <EventCard
                  key={event.event_id || event.id}
                  eventId={event.event_id || event.id}
                  image={
                    event.banner_url ||
                    "https://picsum.photos/seed/default/600/400"
                  }
                  title={event.title}
                  faculty={event.department_name || "Đơn vị tổ chức"}
                  date={`${event.start_time || ""}`}
                  location={event.location}
                  badgeText={
                    event.registered_count > 0
                      ? `${event.registered_count} đã đăng ký`
                      : "Mới"
                  }
                  {...event}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm font-medium">
                  Không tìm thấy sự kiện phù hợp
                </p>
                <p className="text-xs mt-1">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                Trang trước
              </button>
              <span className="text-sm text-gray-500 font-medium">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] rounded-lg disabled:opacity-50 cursor-pointer"
              >
                Trang sau
              </button>
            </div>
          )}
        </section>
        <div className="h-20" />
      </main>
      <FloatingChatbox />
    </div>
  );
}
