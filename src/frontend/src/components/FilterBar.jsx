export default function FilterBar({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  sortOption,
  setSortOption,
}) {
  const categories = [
    'Tất cả',
    'Học thuật',
    'Kỹ năng mềm',
    'Việc làm',
    'Văn hóa - Nghệ thuật',
    'Tình nguyện',
    'Khởi nghiệp',
  ];

  const sorts = ['Sắp diễn ra', 'Nổi nhất'];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 sm:p-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">

        {/* Search input — nửa bề ngang */}
        <div className="relative md:w-1/2 w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </span>
          <input
            id="event-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm sự kiện..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 placeholder-gray-400 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
          />
        </div>

        {/* Hai select chia đôi nửa còn lại */}
        <div className="flex flex-col sm:flex-row gap-3 md:flex-1">
          {/* Category */}
          <div className="relative flex-1">
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 cursor-pointer transition"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Lĩnh vực {c === 'Tất cả' ? '(Tất cả)' : c}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </div>

          {/* Sort */}
          <div className="relative flex-1">
            <select
              id="filter-sort"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 cursor-pointer transition"
            >
              {sorts.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronIcon />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
}
