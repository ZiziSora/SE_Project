import { Building2, LockKeyhole, UserRound } from "lucide-react";

const SideTabProfile = ({ role, activeTab, onTabChange }) => {
  const isOrganizer = role === "organizer";
  const ProfileIcon = isOrganizer ? Building2 : UserRound;
  const baseClass =
    "relative flex h-10 w-full items-center gap-2 rounded-lg px-4 text-left font-inter text-sm tracking-wide transition-colors hover:bg-purple-50 hover:text-[#6610df] max-sm:justify-center max-sm:px-2 max-sm:text-xs max-sm:tracking-normal";
  const activeClass =
    "bg-[#f0f2ff] text-[#6610df] before:absolute before:inset-y-0 before:-left-px before:w-1 before:rounded-full before:bg-[#6610df] max-sm:before:inset-x-0 max-sm:before:top-auto max-sm:before:-bottom-px max-sm:before:h-[3px] max-sm:before:w-full";

  return (
    <nav
      className="flex flex-col gap-px rounded-xl border border-[#e2e5ef] bg-white p-2 shadow-[0_6px_14px_rgba(31,38,60,0.07)] max-sm:w-full max-sm:flex-row"
      aria-label="Cài đặt tài khoản"
    >
      <button
        type="button"
        className={`${baseClass} ${activeTab === "profile" ? activeClass : "text-[#647086]"}`}
        onClick={() => onTabChange("profile")}
      >
        <ProfileIcon size={19} strokeWidth={1.8} />
        <span>{isOrganizer ? "Thông tin tổ chức" : "Thông tin cá nhân"}</span>
      </button>

      <button
        type="button"
        className={`${baseClass} ${activeTab === "security" ? activeClass : "text-[#647086]"}`}
        onClick={() => onTabChange("security")}
      >
        <LockKeyhole size={18} strokeWidth={1.8} />
        <span>Bảo mật &amp; Tài khoản</span>
      </button>
    </nav>
  );
};

export default SideTabProfile;
