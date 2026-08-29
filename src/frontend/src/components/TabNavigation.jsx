const TABS = ["Sắp diễn ra", "Đã tham gia", "Đã lưu", "Vắng mặt", "Đã hủy"];

export default function TabNavigation({
    activeTab,
    setActiveTab,
    registrations,
    savedEvents,
    getEffectiveStatus,
}) {
  return (
    <div className="mt-6 inline-flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-[#f1f3f5] p-1">
      {TABS.map((tab) => {
        const count =
          tab === "Đã lưu"
            ? savedEvents.length
            : registrations.filter((item) => {
                const status = getEffectiveStatus(item);
                if (tab === "Sắp diễn ra") return status === "REGISTERED" || status === "WAITLISTED";
                if (tab === "Đã tham gia") return status === "ATTENDED";
                if (tab === "Vắng mặt") return status === "ABSENT";
                if (tab === "Đã hủy") return status === "CANCELLED";
                return false;
              }).length;

        const isActive = activeTab === tab;

        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 rounded-lg px-5 py-1.5 text-xs font-semibold transition-all ${
              isActive
                ? "bg-white text-purple-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>{tab}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                isActive
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
