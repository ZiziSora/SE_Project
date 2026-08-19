import Header from '../components/Header';
import FilterBar from '../components/FilterBar';
import EventCard from '../components/EventCard';
import { useEventFilter } from '../utils/useEventFilter';

export default function OrganizerHomePage() {
    // Gọi custom hook để quản lý toàn bộ filter, phân trang và gọi API
    const { filters, setters, events, totalPages } = useEventFilter();

    return (
        <div className="min-h-screen bg-white font-sans">
            <Header role="organizer" />

            <main className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-7 max-w-5xl">
                <section id="hero-title" className="space-y-2 pt-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight" style={{ color: '#7C3AED' }}>
                        Cập nhật sự kiện toàn trường
                    </h1>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
                        Theo dõi và quản lý các hoạt động học thuật, hội thảo, và phong trào đang diễn ra.
                    </p>
                </section>

                {/* Thanh lọc liên kết trực tiếp với hook */}
                <FilterBar
                    searchTerm={filters.searchTerm}
                    setSearchTerm={setters.setSearchTerm}
                    selectedFaculty={filters.selectedFaculty}
                    setSelectedFaculty={setters.setSelectedFaculty}
                    selectedCategory={filters.selectedCategory}
                    setSelectedCategory={setters.setSelectedCategory}
                    sortOption={filters.sortOption}
                    setSortOption={setters.setSortOption}
                />

                {/* Danh sách sự kiện */}
                <section id="all-events" className="rounded-2xl p-4 sm:p-5 bg-white" style={{ border: '1.5px solid #E5E7EB', boxShadow: '0 1px 8px 0 rgba(0,0,0,0.06)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {events.length > 0 ? (
                            events.map((event) => (
                                <EventCard
                                    key={event.event_id || event.id}
                                    eventId={event.event_id || event.id}
                                    role="organizer"
                                    image={event.banner_url || 'https://picsum.photos/seed/default/600/400'}
                                    title={event.title}
                                    faculty={event.department_name || 'Đơn vị tổ chức'}
                                    date={`${event.start_time || ''}`}
                                    location={event.location}
                                    badgeText={event.registered_count > 0 ? `${event.registered_count} đã đăng ký` : 'Mới'}
                                    {...event}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-gray-400">
                                <p className="text-4xl mb-3">🔍</p>
                                <p className="text-sm font-medium">Không tìm thấy sự kiện phù hợp</p>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-8 flex justify-center items-center gap-4">
                            <button
                                onClick={() => setters.setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={filters.currentPage === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg disabled:opacity-50 cursor-pointer"
                            >
                                Trang trước
                            </button>
                            <span className="text-sm text-gray-500 font-medium">
                                Trang {filters.currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setters.setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={filters.currentPage === totalPages}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] rounded-lg disabled:opacity-50 cursor-pointer"
                            >
                                Trang sau
                            </button>
                        </div>
                    )}
                </section>
                <div className="h-20" />
            </main>
        </div>
    );
}
