import { useState, useEffect } from 'react';
import { publicEventApi } from '../api/eventApi.js';

export function useEventFilter() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [sortOption, setSortOption] = useState('Sắp diễn ra');
    const [currentPage, setCurrentPage] = useState(1);

    const [events, setEvents] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        async function fetchFilteredEvents() {
            try {
                setLoading(true);
                const data = await publicEventApi.list(
                    {
                        search_term: searchTerm,
                        category: selectedCategory === 'Tất cả' ? undefined : selectedCategory,
                        sort_by: sortOption,
                        page: currentPage,
                        limit: 12,
                    },
                    { signal: controller.signal },
                );

                // Bỏ qua phản hồi của request đã bị huỷ để danh sách không bị
                // response cũ về muộn ghi đè (ví dụ khi xoá nhanh từ khoá tìm kiếm).
                if (controller.signal.aborted) return;

                if (data && data.events) {
                    setEvents(data.events);
                    setTotalPages(data.total_pages || 1);
                }
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error('Lỗi lọc sự kiện:', err);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        fetchFilteredEvents();
        return () => controller.abort();
    }, [searchTerm, selectedCategory, sortOption, currentPage]);

    return {
        filters: { searchTerm, selectedCategory, sortOption, currentPage },
        setters: { setSearchTerm, setSelectedCategory, setSortOption, setCurrentPage },
        events,
        totalPages,
        loading
    };
}
