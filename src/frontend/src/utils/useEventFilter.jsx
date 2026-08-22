import { useState, useEffect } from 'react';
import { publicEventApi } from '../api/eventApi.js';

export function useEventFilter() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState('Tất cả');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [sortOption, setSortOption] = useState('Mới nhất');
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
                        faculty: selectedFaculty === 'Tất cả' ? undefined : selectedFaculty,
                        category: selectedCategory === 'Tất cả' ? undefined : selectedCategory,
                        sort_by: sortOption,
                        page: currentPage,
                        limit: 12,
                    },
                    { signal: controller.signal },
                );

                if (data && data.events) {
                    setEvents(data.events);
                    setTotalPages(data.total_pages || 1);
                }
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error('Lỗi lọc sự kiện:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchFilteredEvents();
        return () => controller.abort();
    }, [searchTerm, selectedFaculty, selectedCategory, sortOption, currentPage]);

    return {
        filters: { searchTerm, selectedFaculty, selectedCategory, sortOption, currentPage },
        setters: { setSearchTerm, setSelectedFaculty, setSelectedCategory, setSortOption, setCurrentPage },
        events,
        totalPages,
        loading
    };
}
