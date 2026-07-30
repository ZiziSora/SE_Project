import { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import EventCard from './components/EventCard';
import FloatingChatbox from './components/FloatingChatbox';

// ─── Dummy Data ───────────────────────────────────────────────────────────────

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

const mockEvents = [
  {
    id: 'e1',
    image: 'https://picsum.photos/seed/ai-education/600/400',
    badgeText: 'Sắp diễn ra',
    title: 'Hội thảo AI trong giáo dục: Thách thức và Cơ hội',
    faculty: 'Khoa CNTT',
    department: 'Khoa CNTT',
    category: 'Học thuật',
    date: '25/10/2024 • 08:00',
    location: 'Hội trường A, Khu V',
    created_at: '2024-10-15T08:00:00Z',
    registered_count: 320,
    isFeatured: false,
  },
  {
    id: 'e2',
    image: 'https://picsum.photos/seed/career-fair/600/400',
    badgeText: 'Sắp diễn ra',
    title: 'Ngày hội việc làm Sinh viên 2024',
    faculty: 'Phòng Công tác SV',
    department: 'Phòng Công tác SV',
    category: 'Việc làm',
    date: '20/10/2024 • 07:30',
    location: 'Sân vận động Trung tâm',
    created_at: '2024-10-10T07:30:00Z',
    registered_count: 850,
    isFeatured: false,
  },
  {
    id: 'e3',
    image: 'https://picsum.photos/seed/softskills/600/400',
    badgeText: 'Đã đầy',
    title: 'Workshop: Kỹ năng thuyết trình trước đám đông',
    faculty: 'CLB Kỹ năng Mềm',
    department: 'Khoa CNTT',
    category: 'Kỹ năng mềm',
    date: '10/10/2024 • 14:00',
    location: 'Phòng Hội thảo 2',
    created_at: '2024-10-01T14:00:00Z',
    registered_count: 150,
    isFeatured: false,
  },
  {
    id: 'e4',
    image: 'https://picsum.photos/seed/photography-club/600/400',
    badgeText: 'Sắp diễn ra',
    title: 'Lễ hội Ánh sáng & Tuyển thành viên CLB Nhiếp ảnh',
    faculty: 'Liên Chi hội Sinh viên',
    department: 'Khoa Sinh học',
    category: 'Văn hóa - Nghệ thuật',
    date: '5/10/2024 • 18:00',
    location: 'Sân trước Thư viện',
    created_at: '2024-09-28T18:00:00Z',
    registered_count: 210,
    isFeatured: false,
  },
  {
    id: 'e5',
    image: 'https://picsum.photos/seed/startup-hcmus/600/400',
    badgeText: 'Mới',
    title: 'Startup Weekend HCMUS 2024: Ươm mầm ý tưởng khởi nghiệp',
    faculty: 'Khoa Toán - Tin',
    department: 'Khoa Toán - Tin',
    category: 'Khởi nghiệp',
    date: '15/10/2024 • 09:00',
    location: 'Phòng Lab B3, Khu B',
    created_at: '2024-10-18T09:00:00Z',
    registered_count: 95,
    isFeatured: false,
  },
  {
    id: 'e6',
    image: 'https://picsum.photos/seed/environment-day/600/400',
    badgeText: 'Tình nguyện',
    title: 'Ngày hội Môi trường Xanh – Trồng cây, Dọn rác cùng HCMUS',
    faculty: 'Khoa Môi trường',
    department: 'Khoa Môi trường',
    category: 'Tình nguyện',
    date: '22/10/2024 • 07:00',
    location: 'Khuôn viên Trường',
    created_at: '2024-10-20T07:00:00Z',
    registered_count: 430,
    isFeatured: false,
  },
];

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('Tất cả');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [sortOption, setSortOption] = useState('Mới nhất');
  const [events, setEvents] = useState(mockEvents);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search_term', searchTerm);
        if (selectedFaculty) params.append('faculty', selectedFaculty);
        if (selectedCategory) params.append('category', selectedCategory);
        if (sortOption) params.append('sort_by', sortOption);

        const res = await fetch(`/api/events?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.events) {
          setEvents(data.events);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch events', err);
      }
    }

    fetchEvents();
    return () => controller.abort();
  }, [searchTerm, selectedFaculty, selectedCategory, sortOption]);

  // ─── Bước 2: Filter + Sort động với useMemo ───────────────────────────────
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Filter theo keyword
    if (searchTerm.trim() !== '') {
      const keyword = searchTerm.trim().toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(keyword));
    }

    // Filter theo Khoa
    if (selectedFaculty !== 'Tất cả') {
      result = result.filter((e) => e.department === selectedFaculty);
    }

    // Filter theo Lĩnh vực
    if (selectedCategory !== 'Tất cả') {
      result = result.filter((e) => e.category === selectedCategory);
    }

    // Sắp xếp
    if (sortOption === 'Mới nhất') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortOption === 'Nổi nhất') {
      result.sort((a, b) => b.registered_count - a.registered_count);
    }

    return result;
  }, [events, searchTerm, selectedFaculty, selectedCategory, sortOption]);

  const displayedEvents = showMore ? filteredEvents : filteredEvents.slice(0, 4);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Header: full-width sticky ── */}
      <Header />

      {/* ── Page content: centered, max-w ~780px ── */}
      <main
        className="mx-auto px-6 py-8 space-y-7"
        style={{ maxWidth: '780px' }}
      >

        {/* ── Hero Title ── */}
        <section id="hero-title" className="space-y-2 pt-1">
          <h1
            className="text-3xl font-extrabold leading-tight"
            style={{ color: '#7C3AED' }}
          >
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

        {/* ── All Events ── */}
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
                <EventCard key={event.id} {...event} />
              ))
            ) : (
              <div className="col-span-4 py-12 text-center text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm font-medium">Không tìm thấy sự kiện phù hợp</p>
                <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
              </div>
            )}
          </div>

          {!showMore && filteredEvents.length > 4 && (
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
