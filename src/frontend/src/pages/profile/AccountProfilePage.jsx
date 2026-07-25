import { useEffect, useRef, useState } from "react";
import { ChevronDown, ImagePlus, LoaderCircle } from "lucide-react";
import { toast } from "react-toastify";
import SideTabProfile from "../../components/SideTabProfile";
import {
  changePassword,
  getMyProfile,
  uploadAvatar,
} from "../../api/profileApi";

const studentInitialData = {
  fullName: "",
  email: "",
  phone: "",
  studentId: "",
  university: "",
};

const organizerInitialData = {
  organizationName: "",
  organizationType: "",
  email: "",
  phone: "",
  address: "",
};

const inputClass =
  "h-10 w-full rounded-lg border border-[#7b8596] bg-white px-4 font-inter text-sm text-[#233247] outline-none transition focus:border-[#6610df] focus:ring-3 focus:ring-purple-100";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const Field = ({ label, className = "", horizontal = false, children }) => (
  <label
    className={`${horizontal ? "grid grid-cols-[188px_260px] items-center gap-0 max-sm:grid-cols-1 max-sm:gap-2" : "flex flex-col gap-1"} ${className}`}
  >
    <span
      className={
        horizontal
          ? "text-base font-normal text-[#102238]"
          : "text-[13px] font-medium tracking-wide text-[#4f4c57]"
      }
    >
      {label}
    </span>
    {children}
  </label>
);

const CardTitle = ({ children, security = false }) => (
  <div
    className={
      security
        ? "w-fit border-b-4 border-[#7c36f2] pb-2"
        : "border-b border-[#d6cee3] pb-2"
    }
  >
    <h2 className="m-0 text-[21px] font-medium">{children}</h2>
  </div>
);

const UploadArea = ({ organizer, avatarUrl, onAvatarUpdated }) => {
  const inputRef = useRef(null);
  const localPreviewRef = useRef("");

  const [previewUrl, setPreviewUrl] = useState(avatarUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const displayedAvatarUrl = previewUrl || avatarUrl;

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
      }
    };
  }, []);

  const handleSelectFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Ảnh đại diện không được vượt quá 2 MB.");
      event.target.value = "";
      return;
    }

    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
    }

    const localPreviewUrl = URL.createObjectURL(file);
    localPreviewRef.current = localPreviewUrl;
    setPreviewUrl(localPreviewUrl);

    try {
      setIsUploading(true);
      setError("");

      const result = await uploadAvatar(file);

      setPreviewUrl(result.avatar_url);
      onAvatarUpdated?.(result.avatar_url);
      toast.success(
        organizer
          ? "Cập nhật logo tổ chức thành công."
          : "Cập nhật ảnh đại diện thành công.",
      );
    } catch (error) {
      const message =
        error.response?.data?.detail || "Không thể cập nhật ảnh đại diện.";

      setError(message);
      setPreviewUrl(avatarUrl || "");
      toast.error(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
        localPreviewRef.current = "";
      }
    }
  };

  return (
    <div className="my-6 flex items-start gap-4">
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className={`relative grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-[#d2c6df] disabled:cursor-wait ${organizer ? "bg-[#f3f3fb] text-[#cfc3dd]" : "bg-linear-to-br from-[#7c36f2] to-[#b16af5] text-2xl font-bold text-white"}`}
        aria-label={organizer ? "Tải logo tổ chức" : "Tải ảnh đại diện"}
      >
        {displayedAvatarUrl ? (
          <img
            className="size-full object-cover"
            src={displayedAvatarUrl}
            alt={organizer ? "Logo tổ chức" : "Ảnh đại diện"}
          />
        ) : organizer ? (
          <ImagePlus size={28} />
        ) : (
          <span>MA</span>
        )}
        {isUploading && (
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white">
            <LoaderCircle className="animate-spin" size={26} />
          </span>
        )}
      </button>
      <div className="min-w-0">
        <strong className="mb-1 block text-sm font-semibold tracking-wide">
          {organizer ? "Logo tổ chức" : "Ảnh đại diện"}
        </strong>
        <p className="mb-2 text-sm text-[#657189]">
          Định dạng JPG, PNG hoặc WEBP. Tối đa 2MB.
        </p>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className={`inline-flex h-8 min-w-28 cursor-pointer items-center justify-center rounded-lg border bg-white text-xs disabled:cursor-wait disabled:opacity-60 ${organizer ? "border-[#58657a] text-[#536075]" : "border-[#6610df] text-[#6610df]"}`}
        >
          {isUploading ? "Đang tải..." : "Tải ảnh lên"}
        </button>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleSelectFile}
        />
        {error && (
          <p className="mt-2 max-w-sm text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

const StudentProfileForm = ({ data, setData, avatarUrl, onAvatarUpdated }) => (
  <>
    <CardTitle>Thông tin cá nhân</CardTitle>
    <UploadArea avatarUrl={avatarUrl} onAvatarUpdated={onAvatarUpdated} />
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 max-sm:grid-cols-1">
      <Field label="Họ và tên">
        <input
          className={inputClass}
          value={data.fullName}
          onChange={(event) =>
            setData({ ...data, fullName: event.target.value })
          }
        />
      </Field>
      <Field label="Mã sinh viên">
        <input
          className={inputClass}
          value={data.studentId}
          onChange={(event) =>
            setData({ ...data, studentId: event.target.value })
          }
        />
      </Field>
      <Field label="Email">
        <input
          className={inputClass}
          type="email"
          value={data.email}
          onChange={(event) => setData({ ...data, email: event.target.value })}
        />
      </Field>
      <Field label="Số điện thoại">
        <input
          className={inputClass}
          value={data.phone}
          onChange={(event) => setData({ ...data, phone: event.target.value })}
        />
      </Field>
      <Field label="Trường đại học" className="col-span-2 max-sm:col-span-1">
        <input
          className={inputClass}
          value={data.university}
          onChange={(event) =>
            setData({ ...data, university: event.target.value })
          }
        />
      </Field>
    </div>
  </>
);

const OrganizerProfileForm = ({ data, setData, avatarUrl, onAvatarUpdated }) => (
  <>
    <CardTitle>Thông tin tổ chức</CardTitle>
    <UploadArea
      organizer
      avatarUrl={avatarUrl}
      onAvatarUpdated={onAvatarUpdated}
    />
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 max-sm:grid-cols-1">
      <Field label="Tên tổ chức/đơn vị">
        <input
          className={inputClass}
          value={data.organizationName}
          onChange={(event) =>
            setData({ ...data, organizationName: event.target.value })
          }
        />
      </Field>
      <Field label="Loại tổ chức">
        <div className="relative">
          <select
            className={`${inputClass} appearance-none pr-10`}
            value={data.organizationType}
            onChange={(event) =>
              setData({ ...data, organizationType: event.target.value })
            }
          >
            <option>Đoàn/Hội</option>
            <option>Câu lạc bộ</option>
            <option>Khoa/Bộ môn</option>
            <option>Đơn vị đối tác</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#69758a]"
            size={19}
          />
        </div>
      </Field>
      <Field label="Email liên hệ">
        <input
          className={inputClass}
          type="email"
          value={data.email}
          onChange={(event) => setData({ ...data, email: event.target.value })}
        />
      </Field>
      <Field label="Số điện thoại liên hệ">
        <input
          className={inputClass}
          value={data.phone}
          onChange={(event) => setData({ ...data, phone: event.target.value })}
        />
      </Field>
      <Field
        label="Địa điểm/văn phòng"
        className="col-span-2 max-sm:col-span-1"
      >
        <input
          className={inputClass}
          value={data.address}
          onChange={(event) =>
            setData({ ...data, address: event.target.value })
          }
        />
      </Field>
    </div>
  </>
);

const SecurityForm = ({ passwords, setPasswords }) => (
  <>
    <CardTitle security>Bảo mật &amp; Tài khoản</CardTitle>
    <section>
      <h3 className="my-6 text-xl font-medium">Đổi mật khẩu</h3>
      <div className="flex w-[448px] flex-col gap-6 max-sm:w-full">
        <Field label="Mật khẩu hiện tại" horizontal>
          <input
            className={`${inputClass} rounded-none`}
            type="password"
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(event) =>
              setPasswords({
                ...passwords,
                currentPassword: event.target.value,
              })
            }
          />
        </Field>
        <Field label="Mật khẩu mới" horizontal>
          <input
            className={`${inputClass} rounded-none`}
            type="password"
            autoComplete="new-password"
            value={passwords.newPassword}
            onChange={(event) =>
              setPasswords({ ...passwords, newPassword: event.target.value })
            }
          />
        </Field>
        <Field label="Xác nhận mật khẩu mới" horizontal>
          <input
            className={`${inputClass} rounded-none`}
            type="password"
            autoComplete="new-password"
            value={passwords.confirmPassword}
            onChange={(event) =>
              setPasswords({
                ...passwords,
                confirmPassword: event.target.value,
              })
            }
          />
        </Field>
      </div>
    </section>
  </>
);

const AccountProfilePage = ({ role, initialTab }) => {
  const isOrganizer = role === "organizer";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profileData, setProfileData] = useState(
    isOrganizer ? organizerInitialData : studentInitialData,
  );
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getMyProfile()
      .then((profile) => {
        if (!isMounted) return;

        setAvatarUrl(profile.avatar_url || "");
        setProfileError("");

        if (isOrganizer) {
          setProfileData({
            organizationName: profile.full_name || "",
            organizationType: profile.organization_type || "",
            email: profile.email || "",
            phone: profile.contact_phone || "",
            address: profile.office_address || "",
          });
          return;
        }

        setProfileData({
          fullName: profile.full_name || "",
          email: profile.email || "",
          phone: profile.contact_phone || "",
          studentId: profile.student_code || "",
          university: profile.department_name || "",
        });
      })
      .catch((error) => {
        if (!isMounted) return;

        setProfileError(
          error.response?.data?.detail ||
            "Không thể tải thông tin tài khoản. Vui lòng thử lại.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOrganizer]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (activeTab === "security") {
      if (
        !passwords.currentPassword ||
        !passwords.newPassword ||
        !passwords.confirmPassword
      ) {
        toast.error("Vui lòng nhập đầy đủ thông tin mật khẩu.");
        return;
      }
      if (passwords.newPassword.length < 8) {
        toast.error("Mật khẩu mới cần có ít nhất 8 ký tự.");
        return;
      }
      if (passwords.newPassword !== passwords.confirmPassword) {
        toast.error("Mật khẩu xác nhận chưa khớp.");
        return;
      }

      if (passwords.currentPassword === passwords.newPassword) {
        toast.error("Mật khẩu mới phải khác mật khẩu hiện tại.");
        return;
      }

      try {
        setIsPasswordUpdating(true);
        const result = await changePassword(passwords);
        setPasswords({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        toast.success(result.message || "Cập nhật mật khẩu thành công.");
      } catch (error) {
        toast.error(
          error.response?.data?.detail ||
            "Không thể cập nhật mật khẩu. Vui lòng thử lại.",
        );
      } finally {
        setIsPasswordUpdating(false);
      }
      return;
    }
    toast.success(
      isOrganizer ? "Đã lưu thông tin tổ chức." : "Đã lưu thông tin cá nhân.",
    );
  };

  const contentClass = isOrganizer
    ? "mx-auto w-[calc(100%_-_48px)] max-w-[1270px] flex-1 py-6 pb-24 max-sm:w-[calc(100%_-_32px)] max-sm:py-8"
    : "mx-auto w-[calc(100%_-_64px)] max-w-[1270px] flex-1 pt-4 pb-24 max-sm:w-[calc(100%_-_32px)] max-sm:py-8";
  const layoutClass = isOrganizer
    ? "grid grid-cols-[256px_minmax(0,1fr)] items-start gap-6 max-lg:grid-cols-[220px_minmax(0,1fr)] max-sm:flex max-sm:flex-col"
    : "grid grid-cols-[256px_minmax(0,867px)] items-start gap-12 max-lg:grid-cols-[220px_minmax(0,1fr)] max-lg:gap-6 max-sm:flex max-sm:flex-col";
  const cardClass = `${isOrganizer ? "p-6" : "p-12 max-lg:p-8"} min-h-[486px] rounded-[13px] border border-[#dcd7e6] bg-white shadow-[0_5px_12px_rgba(30,36,60,0.05)] max-sm:min-h-0 max-sm:w-full max-sm:p-5`;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] font-inter text-[#102238]">
      <main className={contentClass}>
        <div className={isOrganizer ? "mb-6" : "mb-12 max-sm:mb-7"}>
          <h1 className="mb-1 font-manrope text-[clamp(34px,3.1vw,42px)] leading-tight font-bold tracking-[-1.4px] max-sm:text-[32px]">
            Cài đặt tài khoản
          </h1>
          <p className="m-0 text-base text-[#596275] max-sm:text-sm">
            {isOrganizer
              ? "Quản lý thông tin và cài đặt bảo mật cho tổ chức của bạn."
              : "Quản lý thông tin định danh và bảo mật cho tài khoản UniEvent của bạn."}
          </p>
        </div>

        <div className={layoutClass}>
          <SideTabProfile
            role={role}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <form className={cardClass} onSubmit={handleSubmit}>
            {isProfileLoading && (
              <div className="mb-5 flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-3 text-sm text-[#6610df]">
                <LoaderCircle className="animate-spin" size={18} />
                Đang tải thông tin tài khoản...
              </div>
            )}
            {profileError && (
              <p
                className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {profileError}
              </p>
            )}
            {activeTab === "profile" ? (
              isOrganizer ? (
                <OrganizerProfileForm
                  data={profileData}
                  setData={setProfileData}
                  avatarUrl={avatarUrl}
                  onAvatarUpdated={setAvatarUrl}
                />
              ) : (
                <StudentProfileForm
                  data={profileData}
                  setData={setProfileData}
                  avatarUrl={avatarUrl}
                  onAvatarUpdated={setAvatarUrl}
                />
              )
            ) : (
              <SecurityForm passwords={passwords} setPasswords={setPasswords} />
            )}
            <div
              className={`flex justify-end ${activeTab === "security" ? "mt-12 border-t border-[#d6cee3] pt-4" : "mt-8"}`}
            >
              <button
                className={`${activeTab === "security" ? "min-w-52" : "min-w-38"} h-10 cursor-pointer rounded-lg border-0 bg-linear-to-r from-[#7e38ee] to-[#6a0fdc] px-6 font-inter text-[13px] font-semibold tracking-wide text-white shadow-md hover:brightness-95 disabled:cursor-wait disabled:opacity-65 max-sm:w-full`}
                type="submit"
                disabled={activeTab === "security" && isPasswordUpdating}
              >
                {activeTab === "security" ? (
                  isPasswordUpdating ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoaderCircle className="animate-spin" size={17} />
                      Đang cập nhật...
                    </span>
                  ) : (
                    "Cập nhật mật khẩu"
                  )
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AccountProfilePage;
