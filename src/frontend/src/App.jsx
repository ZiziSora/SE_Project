import { useState, useEffect } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import EventCard from './components/EventCard';
import FloatingChatbox from './components/FloatingChatbox';

// ─── Gợi ý cho bạn (Giữ nguyên phần cứng cố định nếu muốn) ─────────────────────
const featuredEvents = [
  {
    id: 'f1',
    image: 'https://picsum.photos/seed/physics-ai/600/400',
    badgeText: '92% Match',
    title: 'Vật lý lượng tử và ứng dụng trong công nghệ tương lai',
    faculty: 'Khoa Vật lý',
    date: '18/7/2024 • 08:00',
    location: 'Sảnh I',
    isFeatured: true,
  },
  {
    id: 'f2',
    image: 'https://picsum.photos/seed/biodiversity/600/400',
    badgeText: 'High Demand',
    title: 'Đa dạng sinh học và bảo tồn các loài nguy cấp tại Việt Nam',
    faculty: 'Khoa Sinh học',
    date: '7/10/2024 • 08:00',
    location: 'Sảnh I',
    isFeatured: true,
  },
  {
    id: 'f3',
    image: 'https://picsum.photos/seed/biotech/600/400',
    badgeText: 'Based on your major',
    title: 'Kỹ thuật nuôi cấy mô tế bào thực vật trong công nghệ sinh học',
    faculty: 'CLB Công nghệ Sinh học',
    date: '5/10/2024 • 08:00',
    location: 'Sảnh I',
    isFeatured: true,
  },
];

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('Tất cả');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [sortOption, setSortOption] = useState('Mới nhất');
  
  // State lưu danh sách sự kiện lấy từ Backend
  const [events, setEvents] = useState([]);
  const [showMore, setShowMore] = useState(false);

  // Gọi API lấy dữ liệu từ FastAPI mỗi khi bộ lọc thay đổi
  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search_term', searchTerm);
        if (selectedFaculty) params.append('faculty', selectedFaculty);
        if (selectedCategory) params.append('category', selectedCategory);
        if (sortOption) params.append('sort_by', sortOption);

        const res = await fetch(`http://127.0.0.1:8000/api/events?${params.toString()}`, {
          signal: controller.signal,
        });
        
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && data.events) {
          setEvents(data.events);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Không thể kết nối đến Backend API:', err);
      }
    }

    fetchEvents();
    return () => controller.abort();
  }, [searchTerm, selectedFaculty, selectedCategory, sortOption]);

  const displayedEvents = showMore ? events : events.slice(0, 4);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Header ── */}
      <Header />

      {/* ── Page content ── */}
      <main className="mx-auto px-6 py-8 space-y-7" style={{ maxWidth: '780px' }}>

        {/* ── Hero Title ── */}
        <section id="hero-title" className="space-y-2 pt-1">
          <h1 className="text-3xl font-extrabold leading-tight" style={{ color: '#7C3AED' }}>
            Cập nhật sự kiện toàn trường
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
            Theo dõi và quản lý các hoạt động học thuật, hội thảo, và phong trào đang
            diễn ra tại các khoa và câu lạc bộ. Nắm bắt thông tin để điều phối hiệu quả.
          </p>
        </section>

        {/* ── Gợi ý cho bạn ── */}
        <section
          id="featured-events"
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, #F8F1FF 0%, #CCC3D8 20%, #7C3AED 55%, #630ED4 100%)',
            border: '1px solid rgba(255,255,255,0.20)',
            boxShadow: '0 4px 32px 0 rgba(99,14,212,0.18)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm">✨</span>
            <h2 className="text-sm font-bold text-white">Gợi ý cho bạn</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </section>

        {/* ── Filter Bar ── */}
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

        {/* ── All Events (Render từ Backend) ── */}
        <section
          id="all-events"
          className="rounded-2xl p-5 bg-white"
          style={{
            border: '1.5px solid #E5E7EB',
            boxShadow: '0 1px 8px 0 rgba(0,0,0,0.06)',
          }}
        >
          <div className="grid grid-cols-4 gap-4">
            {displayedEvents.length > 0 ? (
              displayedEvents.map((event) => (
                <EventCard 
                  key={event.event_id || event.id} 
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
              <div className="col-span-4 py-12 text-center text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm font-medium">Không tìm thấy sự kiện phù hợp từ Database</p>
                <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
              </div>
            )}
          </div>

          {!showMore && events.length > 4 && (
            <div className="mt-5 text-center">
              <button
                id="show-more-btn"
                onClick={() => setShowMore(true)}
                className="text-sm text-gray-500 hover:text-gray-700 transition font-medium"
              >
                Xem thêm
              </button>
            </div>
          )}
        </section>

        <div className="h-20" />
      </main>

      {/* ── Floating Chatbox ── */}
      <FloatingChatbox />
    </div>
  );
}