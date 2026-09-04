import {
  ChevronDown,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const categoryShortcuts = [
  { label: "Tất cả", value: "Tất cả" },
  { label: "Học thuật", value: "Học thuật" },
  { label: "Kỹ năng", value: "Kỹ năng mềm" },
  { label: "Tình nguyện", value: "Tình nguyện" },
  { label: "Văn hóa / Nghệ thuật", value: "Văn hóa - Nghệ thuật" },
  { label: "Việc làm", value: "Việc làm" },
  { label: "Khởi nghiệp", value: "Khởi nghiệp" },
];

const sorts = ["Sắp diễn ra", "Mới nhất", "Nổi nhất"];

export default function FilterBar({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  sortOption,
  setSortOption,
  defaultSortOption = "Sắp diễn ra",
}) {
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("Tất cả");
    setSortOption(defaultSortOption);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      selectedCategory !== "Tất cả" ||
      sortOption !== defaultSortOption,
  );

  const selectClasses =
    "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-violet-600 focus:bg-white focus:ring-2 focus:ring-violet-100";

  return (
    <>
      {/* Search + Category row */}
      <div
        className="grid gap-5 lg:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)] lg:items-end"
        role="search"
        aria-labelledby="event-filter-heading"
      >
        <h2 id="event-filter-heading" className="sr-only">
          Tìm và lọc sự kiện
        </h2>

        {/* Search input */}
        <label className="block" htmlFor="event-search">
          <span className="mb-2 block text-sm font-semibold text-slate-800">
            Bạn muốn khám phá điều gì?
          </span>
          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-violet-600"
              strokeWidth={2}
              aria-hidden="true"
            />
            <input
              id="event-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên sự kiện hoặc chủ đề..."
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-5 text-base text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </span>
        </label>

        {/* Category chips */}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Lĩnh vực
          </p>
          <div
            className="explore-category-rail mt-2.5 flex flex-wrap gap-2 lg:flex-nowrap lg:overflow-x-auto lg:pb-1"
            aria-label="Lĩnh vực sự kiện"
          >
            {categoryShortcuts.map((category) => {
              const isActive = selectedCategory === category.value;

              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setSelectedCategory(category.value)}
                  aria-pressed={isActive}
                  className={`category-shortcut min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 active:scale-[0.97] ${
                    isActive
                      ? "border border-violet-700 bg-violet-700 text-white shadow-md shadow-violet-300/50"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced filters */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-slate-100 pt-4">
        <details className="group w-full max-w-2xl">
          <summary className="inline-flex min-h-10 list-none items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
            Bộ lọc nâng cao
            <ChevronDown
              className="size-4 transition-transform duration-200 group-open:rotate-180"
              strokeWidth={2}
              aria-hidden="true"
            />
          </summary>

          <div className="mt-3 grid gap-3 sm:grid-cols-1">
            <label className="block" htmlFor="filter-sort">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                Sắp xếp
              </span>
              <span className="relative block">
                <select
                  id="filter-sort"
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value)}
                  className={selectClasses}
                >
                  {sorts.map((sort) => (
                    <option key={sort} value={sort}>
                      {sort}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </span>
            </label>
          </div>
        </details>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-500 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
          >
            <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
            Xóa bộ lọc
          </button>
        )}
      </div>
    </>
  );
}
