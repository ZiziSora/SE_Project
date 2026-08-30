import {
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  SearchX,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { publicEventApi } from "../api/eventApi.js";
import { getMyEvents } from "../api/registrationApi.js";
import EventCard from "../components/EventCard.jsx";
import FilterBar from "../components/FilterBar.jsx";
import FloatingChatbox from "../components/FloatingChatbox.jsx";
import AdminHeader from "../components/common/AdminHeader.jsx";
import OrganizerHeader from "../components/common/OrganizerHeader.jsx";
import StudentHeader from "../components/common/StudentHeader.jsx";

const CATEGORY_LABELS = {
  1: "Học thuật",
  2: "Kỹ năng mềm",
  3: "Việc làm",
  4: "Văn hóa - Nghệ thuật",
  5: "Tình nguyện",
  6: "Khởi nghiệp",
};

const getEventId = (event) => event.event_id || event.id;

const getEventOrganizer = (event) =>
  event.department_name ||
  event.organizer?.department_name ||
  event.organizer?.name ||
  "Đơn vị tổ chức";

const isPublishedEvent = (event) =>
  String(event.event_status || "PUBLISHED").toUpperCase() === "PUBLISHED";

export default function ExploreEventsPage() {
  const hasAccessToken = Boolean(localStorage.getItem("access_token"));
  const userRole = hasAccessToken ? localStorage.getItem("role") : null;
  const isAuthenticatedStudent = userRole === "student";
  const isAuthenticatedOrganizer = userRole === "organizer";
  const isAuthenticatedAdmin = userRole === "admin";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("Tất cả");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [sortOption, setSortOption] = useState("Mới nhất");
  const [events, setEvents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(
    isAuthenticatedStudent,
  );
  const [registrationByEventId, setRegistrationByEventId] = useState(
    () => new Map(),
  );

  useEffect(() => {
    if (!isAuthenticatedStudent) return undefined;

    let isMounted = true;

    getMyEvents()
      .then((items) => {
        if (!isMounted) return;

        const registrations = (items || [])
          .map((item) => [
            item.event_id || item.events?.event_id,
            String(item.registration_status || "REGISTERED").toUpperCase(),
          ])
          .filter(([eventId, status]) => eventId && status !== "CANCELLED");

        setRegistrationByEventId(new Map(registrations));
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isAuthenticatedStudent]);

  const handleRegistered = useCallback((eventId, result) => {
    setRegistrationByEventId((current) =>
      new Map(current).set(
        eventId,
        result?.is_waitlisted ? "WAITLISTED" : "REGISTERED",
      ),
    );

    const nextCount = Number(result?.count);
    if (!Number.isFinite(nextCount)) return;

    const updateCount = (event) =>
      getEventId(event) === eventId
        ? { ...event, registered_count: nextCount }
        : event;

    setEvents((current) => current.map(updateCount));
    setRecommendedEvents((current) => current.map(updateCount));
  }, []);

  useEffect(() => {
    if (!isAuthenticatedStudent) return undefined;

    const controller = new AbortController();

    async function fetchRecommendations() {
      setLoadingRecommendations(true);

      try {
        const data = await publicEventApi.getRecommendations(3, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setRecommendedEvents(data?.recommendations || data?.items || []);
        }
      } catch (error) {
        if (error.name !== "CanceledError" && !controller.signal.aborted) {
          setRecommendedEvents([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingRecommendations(false);
      }
    }

    fetchRecommendations();
    return () => controller.abort();
  }, [isAuthenticatedStudent]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      setIsLoadingEvents(true);
      setEventsError("");

      try {
        const data = await publicEventApi.list(
          {
            search_term: searchTerm,
            faculty: selectedFaculty,
            category: selectedCategory,
            sort_by: sortOption,
            page: currentPage,
            limit: 12,
          },
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setEvents(data?.events || []);
          setTotalPages(Math.max(data?.total_pages || 1, 1));
          setTotalItems(data?.total_items || 0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setEvents([]);
          setTotalItems(0);
          setEventsError(
            "Không thể tải danh sách sự kiện. Vui lòng kiểm tra kết nối và thử lại.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingEvents(false);
      }
    }

    fetchEvents();
    return () => controller.abort();
  }, [
    searchTerm,
    selectedFaculty,
    selectedCategory,
    sortOption,
    currentPage,
    refreshKey,
  ]);

  const updateSearchTerm = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const updateFaculty = (value) => {
    setSelectedFaculty(value);
    setCurrentPage(1);
  };

  const updateCategory = (value) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const updateSortOption = (value) => {
    setSortOption(value);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedFaculty("Tất cả");
    setSelectedCategory("Tất cả");
    setSortOption("Mới nhất");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      selectedFaculty !== "Tất cả" ||
      selectedCategory !== "Tất cả" ||
      sortOption !== "Mới nhất",
  );

  const listHeading = hasActiveFilters
    ? "Kết quả tìm kiếm"
    : "Sự kiện sắp tới";

  const visibleRecommendedEvents = recommendedEvents.slice(0, 3);
  const getRecommendationReason = (event) =>
    event.recommendation_reason?.trim() ||
    event.reason?.trim() ||
    "Dựa trên các chủ đề bạn quan tâm";

  const recommendationGridClasses =
    visibleRecommendedEvents.length >= 3
      ? "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.85fr)] lg:grid-rows-2"
      : visibleRecommendedEvents.length === 2
        ? "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.85fr)] lg:items-start"
        : "grid grid-cols-1";

  const renderHeader = () => {
    if (isAuthenticatedAdmin) return <AdminHeader />;
    if (isAuthenticatedOrganizer) return <OrganizerHeader />;
    return <StudentHeader />;
  };

  /* Pagination page numbers */
  const getPaginationItems = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 2;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);
    const items = [1];
    if (left > 2) items.push("...");
    for (let i = left; i <= right; i++) items.push(i);
    if (right < totalPages - 1) items.push("...");
    items.push(totalPages);
    return items;
  };

  return (
    <div className="min-h-screen bg-[var(--surface-page)] font-sans text-slate-950">
      {renderHeader()}

      <main className="w-full max-w-full overflow-x-clip">
        {/* ── Hero Banner ── */}
        <div className="explore-hero relative overflow-hidden">
          {/* Gradient background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 explore-hero-bg"
          />
          {/* Floating orbs */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="explore-orb explore-orb-1" />
            <div className="explore-orb explore-orb-2" />
            <div className="explore-orb explore-orb-3" />
          </div>

          <div className="relative mx-auto max-w-[86rem] px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
            <header className="explore-enter max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-violet-500" />
                UniEvent — Nền tảng sự kiện đại học
              </div>
              <h1 className="font-manrope text-4xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-5xl lg:text-[3.5rem]">
                Tìm sự kiện{" "}
                <span className="explore-gradient-text">dành cho bạn</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Khám phá hoạt động học thuật, kỹ năng và cộng đồng phù hợp với điều bạn quan tâm.
              </p>

              {/* Stats row */}
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <div className="explore-stat-chip">
                  <TrendingUp size={14} className="text-violet-600" aria-hidden="true" />
                  <span className="text-slate-700">
                    <strong className="text-slate-950">
                      {isLoadingEvents ? "—" : totalItems}
                    </strong>{" "}
                    sự kiện
                  </span>
                </div>
                <div className="explore-stat-chip">
                  <Sparkles size={14} className="text-violet-600" aria-hidden="true" />
                  <span className="text-slate-700">AI gợi ý cá nhân hóa</span>
                </div>
              </div>
            </header>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="mx-auto max-w-[86rem] px-4 pb-20 sm:px-6 lg:px-8">
          {/* Filter bar lifted into its own visual block */}
          <div className="explore-enter explore-enter-delay-1 -mt-6 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 lg:-mt-10">
            <div className="p-5 sm:p-6">
              <FilterBar
                searchTerm={searchTerm}
                setSearchTerm={updateSearchTerm}
                selectedFaculty={selectedFaculty}
                setSelectedFaculty={updateFaculty}
                selectedCategory={selectedCategory}
                setSelectedCategory={updateCategory}
                sortOption={sortOption}
                setSortOption={updateSortOption}
              />
            </div>
          </div>

          {/* ── AI Recommendations ── */}
          {isAuthenticatedStudent &&
            (loadingRecommendations || visibleRecommendedEvents.length > 0) && (
              <section className="mt-12" aria-labelledby="recommendations-heading">
                <div className="explore-enter explore-enter-delay-2 rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-6 shadow-lg shadow-violet-900/5 sm:p-8">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-lg">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                        <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
                        Dành riêng cho bạn
                      </p>
                      <h2
                        id="recommendations-heading"
                        className="mt-2 font-manrope text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[1.75rem]"
                      >
                        Gợi ý của AI
                      </h2>
                      <p className="mt-1.5 text-sm leading-6 text-slate-500">
                        Được chọn dựa trên chủ đề và lịch sử tham gia của bạn.
                      </p>
                    </div>
                  </div>

                  {loadingRecommendations ? (
                    <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.85fr)] lg:grid-rows-2">
                      <div className="explore-skeleton h-[34rem] rounded-2xl border border-violet-100 bg-white lg:row-span-2 lg:h-auto" />
                      <div className="explore-skeleton h-64 rounded-2xl border border-violet-100 bg-white" />
                      <div className="explore-skeleton h-64 rounded-2xl border border-violet-100 bg-white" />
                    </div>
                  ) : (
                    <div className={`mt-6 ${recommendationGridClasses}`}>
                      {visibleRecommendedEvents.map((event, index) => (
                        <div
                          key={getEventId(event)}
                          className={
                            index === 0 && visibleRecommendedEvents.length >= 3
                              ? "lg:row-span-2"
                              : ""
                          }
                        >
                          <EventCard
                            {...event}
                            eventId={getEventId(event)}
                            event={event}
                            image={event.banner_url}
                            title={event.title}
                            faculty={getEventOrganizer(event)}
                            date={event.start_time}
                            location={event.location}
                            category={
                              event.category_name ||
                              CATEGORY_LABELS[event.category_id]
                            }
                            capacity={event.capacity}
                            registeredCount={event.registered_count}
                            registrationDeadline={event.registration_deadline}
                            reason={getRecommendationReason(event)}
                            variant={
                              index === 0
                                ? "recommended-featured"
                                : "recommended-compact"
                            }
                            canRegister={isPublishedEvent(event)}
                            registered={registrationByEventId.has(
                              getEventId(event),
                            )}
                            waitlisted={
                              registrationByEventId.get(getEventId(event)) ===
                              "WAITLISTED"
                            }
                            onRegistered={handleRegistered}
                            role={userRole}
                            showOrganizer={false}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

          {/* ── Main Event List ── */}
          <section
            className="mt-14"
            aria-labelledby="event-list-heading"
          >
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
              <div>
                <h2
                  id="event-list-heading"
                  className="font-manrope text-[1.75rem] font-bold tracking-[-0.025em] text-slate-950"
                >
                  {listHeading}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isLoadingEvents
                    ? "Đang tải danh sách sự kiện..."
                    : `Tìm thấy ${totalItems} sự kiện`}
                </p>
              </div>

              {hasActiveFilters && !isLoadingEvents && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-violet-300 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {isLoadingEvents ? (
              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="explore-skeleton h-[26rem] rounded-2xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : eventsError ? (
              <div
                role="alert"
                className="mt-8 rounded-3xl border border-red-100 bg-gradient-to-b from-red-50 to-white px-8 py-14 text-center"
              >
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-100">
                  <RefreshCcw
                    className="size-7 text-red-600"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-5 font-manrope text-xl font-bold text-red-950">
                  Không thể hiển thị sự kiện
                </h3>
                <p className="mx-auto mt-2.5 max-w-lg text-sm leading-6 text-red-700">
                  {eventsError}
                </p>
                <button
                  type="button"
                  onClick={() => setRefreshKey((key) => key + 1)}
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-6 text-sm font-semibold text-white shadow-md shadow-red-900/20 transition-all hover:bg-red-800 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 active:translate-y-0"
                >
                  <RefreshCcw size={15} strokeWidth={2} aria-hidden="true" />
                  Thử lại
                </button>
              </div>
            ) : events.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <EventCard
                    key={getEventId(event)}
                    {...event}
                    eventId={getEventId(event)}
                    event={event}
                    image={event.banner_url}
                    title={event.title}
                    faculty={getEventOrganizer(event)}
                    date={event.start_time}
                    location={event.location}
                    category={
                      event.category_name || CATEGORY_LABELS[event.category_id]
                    }
                    capacity={event.capacity}
                    registeredCount={event.registered_count}
                    registrationDeadline={event.registration_deadline}
                    canRegister={
                      isAuthenticatedStudent && isPublishedEvent(event)
                    }
                    registered={registrationByEventId.has(getEventId(event))}
                    waitlisted={
                      registrationByEventId.get(getEventId(event)) ===
                      "WAITLISTED"
                    }
                    onRegistered={handleRegistered}
                    role={userRole}
                    showOrganizer={false}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-8 py-16 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-slate-100">
                  <SearchX
                    className="size-8 text-slate-400"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-5 font-manrope text-xl font-bold text-slate-900">
                  Không tìm thấy sự kiện
                </h3>
                <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-slate-500">
                  Hãy thử từ khóa khác hoặc điều chỉnh bộ lọc để xem thêm sự kiện.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-violet-300 hover:text-violet-800 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 active:translate-y-0"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}

            {/* ── Pagination ── */}
            {!isLoadingEvents && !eventsError && totalPages > 1 && (
              <nav
                className="mt-10 flex flex-wrap items-center justify-center gap-2"
                aria-label="Phân trang sự kiện"
              >
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                  aria-label="Trang trước"
                  className="explore-page-btn inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>

                {getPaginationItems().map((item, idx) =>
                  item === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="flex h-10 w-10 items-center justify-center text-sm text-slate-400"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      aria-current={currentPage === item ? "page" : undefined}
                      className={`explore-page-btn inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold shadow-sm transition-all ${
                        currentPage === item
                          ? "border-violet-700 bg-violet-700 text-white shadow-violet-300/50"
                          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Trang sau"
                  className="explore-page-btn inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </nav>
            )}
          </section>
        </div>
      </main>

      <FloatingChatbox />
    </div>
  );
}
