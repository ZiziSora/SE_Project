import React from "react";

const TABS = ["Sắp diễn ra", "Đã tham gia", "Vắng mặt", "Đã hủy"];

export default function TabNavigation({ activeTab, setActiveTab, registrations, getEffectiveStatus }) {
    return (
        <div className="inline-flex bg-[#f1f3f5] p-1 rounded-xl border border-gray-200 mt-6 gap-1 flex-wrap">
            {TABS.map((tab) => {
                const count = registrations.filter((item) => {
                    const status = getEffectiveStatus(item);
                    if (tab === "Sắp diễn ra") return status === "REGISTERED";
                    if (tab === "Đã tham gia") return status === "ATTENDED";
                    if (tab === "Vắng mặt") return status === "ABSENT";
                    if (tab === "Đã hủy") return status === "CANCELLED";
                    return false;
                }).length;

                const isActive = activeTab === tab;

                return (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${isActive ? "bg-white text-purple-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            }`}
                    >
                        <span>{tab}</span>
                        <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? "bg-purple-100 text-purple-800" : "bg-gray-200 text-gray-600"
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