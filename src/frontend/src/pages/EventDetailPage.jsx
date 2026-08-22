import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";
import StudentHeader from "../components/common/StudentHeader.jsx";
import OrganizerHeader from "../components/common/OrganizerHeader.jsx";
import { supabase } from "../lib/supabase";
import { publicEventApi } from "../api/eventApi.js";
import {
  Calendar,
  Users,
  MapPin,
  Tag,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { EventPoster } from "../components/EventDetail/EventPoster";
import { EventDetails } from "../components/EventDetail/EventDetails";
import { EventDescription } from "../components/EventDetail/EventDescription";
import { RegisterActionBar } from "../components/EventDetail/RegisterActionBar";
import { BookmarkButton } from "../components/EventDetail/BookmarkButton";
import {
  DEFAULT_EVENT_ID,
  formatVietnameseDate,
  formatVietnameseTime,
} from "../utils/eventDetailUtils.js";

/* =========================================================
   EventDetailPage Component (Dynamic Page based on route /events/:eventId)
   ========================================================= */
export function EventDetailPage() {
  const { eventId } = useParams();
  const currentEventId = eventId || DEFAULT_EVENT_ID;

  // State quản lý thông tin Event & Fetching từ Supabase
  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState(null);

  // State quản lý User & Đăng ký tham gia
  const [user, setUser] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [count, setCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: "" });

  // State quản lý Bookmark (Lưu sự kiện) - chỉ dành cho role Student
  const [saved, setSaved] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const isStudent =
    Boolean(user) &&
    (user?.user_metadata?.role === "student" ||
      localStorage.getItem("role") === "student");

  // Ban tổ chức chỉ được xem chi tiết sự kiện, không thể đăng ký tham gia.
  const isOrganizer =
    Boolean(user) &&
    (user?.user_metadata?.role === "organizer" ||
      localStorage.getItem("role") === "organizer");

  /**
   * 1. Lấy chi tiết sự kiện từ Backend API (GET /events/:eventId)
   */
  const fetchEventDetails = useCallback(async (id) => {
    setEventLoading(true);
    setEventError(null);

    try {
      const data = await publicEventApi.getEvent(id);
      setEvent(data);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết sự kiện:", err);
      setEvent(null);
      setEventError(
        err.response?.status === 404
          ? `Không tìm thấy sự kiện với ID "${id}" trên hệ thống.`
          : err.response?.data?.detail ||
              err.message ||
              "Không thể kết nối đến máy chủ.",
      );
    } finally {
      setEventLoading(false);
    }
  }, []);

  // Fetch Event khi currentEventId thay đổi
  useEffect(() => {
    // Tải lại dữ liệu là chủ đích của effect khi eventId thay đổi.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEventDetails(currentEventId);
  }, [currentEventId, fetchEventDetails]);

  // 2. Setup Supabase Auth listener
  useEffect(() => {
    let isMounted = true;

    async function checkCurrentUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        let activeSession = session;

        // Khôi phục phiên Supabase từ token đã lưu để nhận diện đúng user
        // sau khi tải lại trang.
        if (!activeSession) {
          const storedAccessToken = localStorage.getItem("access_token");
          const storedRefreshToken = localStorage.getItem("refresh_token");

          if (storedAccessToken && storedRefreshToken) {
            const { data, error: restoreError } =
              await supabase.auth.setSession({
                access_token: storedAccessToken,
                refresh_token: storedRefreshToken,
              });

            if (restoreError) {
              console.warn(
                "Không thể khôi phục phiên đăng nhập:",
                restoreError.message,
              );
            } else {
              activeSession = data.session;
            }
          }
        }

        if (isMounted) {
          setUser(activeSession?.user ?? null);
        }
      } catch (err) {
        console.error("Auth status initialization error:", err);
      }
    }

    checkCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // 3. Lấy số lượt đăng ký & trạng thái đăng ký của user hiện tại từ Backend API
  useEffect(() => {
    let isMounted = true;

    async function fetchRegistrationStatus() {
      setDataLoading(true);
      try {
        const status =
          await publicEventApi.getRegistrationStatus(currentEventId);
        if (isMounted) {
          setCount(status.count);
          setRegistered(status.registered);
        }
      } catch (err) {
        console.error("Lỗi khi tải trạng thái đăng ký:", err);
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    }

    fetchRegistrationStatus();

    return () => {
      isMounted = false;
    };
  }, [currentEventId, user]);

  // 3b. Lấy trạng thái Bookmark (đã lưu hay chưa) - chỉ khi user là Student
  useEffect(() => {
    let isMounted = true;

    async function fetchSavedStatus() {
      if (!isStudent) {
        if (isMounted) setSaved(false);
        return;
      }

      try {
        const status = await publicEventApi.getSavedStatus(currentEventId);
        if (isMounted) {
          setSaved(status.saved);
        }
      } catch (err) {
        console.error("Lỗi khi tải trạng thái bookmark:", err);
      }
    }

    fetchSavedStatus();

    return () => {
      isMounted = false;
    };
  }, [currentEventId, isStudent]);

  // 4. Xử lý nút Bookmark (Lưu sự kiện)
  const handleToggleBookmark = async () => {
    if (bookmarkLoading) return;

    setBookmarkLoading(true);
    try {
      if (saved) {
        const result = await publicEventApi.unsaveEvent(currentEventId);
        setSaved(!result.removed);
      } else {
        await publicEventApi.saveEvent(currentEventId);
        setSaved(true);
      }
    } catch (err) {
      console.error("Lỗi khi lưu sự kiện:", err);
      toast.error(
        err.response?.status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : err.response?.data?.detail ||
              "Không thể cập nhật sự kiện đã lưu. Vui lòng thử lại.",
      );
    } finally {
      setBookmarkLoading(false);
    }
  };

  // 5. Xử lý nút Đăng ký tham gia
  const handleRegister = async () => {
    setFeedback({ type: null, message: "" });

    if (!user) {
      setFeedback({
        type: "warning",
        message:
          "Bạn chưa đăng nhập! Vui lòng đăng nhập để đăng ký tham gia sự kiện.",
      });
      return;
    }

    if (registered) return;

    setRegisterLoading(true);

    try {
      const result = await publicEventApi.registerForEvent(currentEventId);
      setCount(result.count);
      setRegistered(true);
      setFeedback(
        result.already_registered
          ? { type: "info", message: "Bạn đã đăng ký sự kiện này từ trước!" }
          : {
              type: "success",
              message:
                "Đăng ký thành công! Bạn đã giữ được chỗ tham gia sự kiện.",
            },
      );
    } catch (err) {
      if (err.response?.status === 401) {
        setFeedback({
          type: "warning",
          message:
            "Bạn chưa đăng nhập! Vui lòng đăng nhập để đăng ký tham gia sự kiện.",
        });
      } else {
        setFeedback({
          type: "error",
          message: `Đăng ký thất bại: ${
            err.response?.data?.detail || err.message || "Vui lòng thử lại sau."
          }`,
        });
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  // Map dữ liệu từ Event (trả về bởi Backend API) vào mảng chi tiết UI
  const details = event
    ? [
        {
          icon: Calendar,
          label: "Ngày & giờ bắt đầu",
          value: formatVietnameseDate(event.start_time),
          subValue: formatVietnameseTime(event.start_time),
        },
        {
          icon: Calendar,
          label: "Ngày & giờ kết thúc",
          value: formatVietnameseDate(event.end_time),
          subValue: formatVietnameseTime(event.end_time),
        },
        {
          icon: Calendar,
          label: "Hạn chót đăng ký",
          value: formatVietnameseDate(event.registration_deadline),
          subValue: formatVietnameseTime(event.registration_deadline),
        },
        {
          icon: Users,
          label: "Số lượng tham gia tối đa",
          value: event.capacity
            ? `${event.capacity} Sinh viên`
            : "Không giới hạn",
        },
        {
          icon: MapPin,
          label: "Địa điểm",
          value: event.location || "Chưa cập nhật địa điểm",
        },
        {
          icon: Tag,
          label: "Lĩnh vực / Danh mục",
          value: event.category_name || "Chưa phân loại",
        },
      ]
    : [];

  const maxCapacity = event?.capacity || 250;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation - hiển thị theo đúng role đang đăng nhập */}
      {isOrganizer ? <OrganizerHeader /> : <StudentHeader />}

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-10 pb-20">
        {/* State 1: Fallback UI khi đang Loading dữ liệu từ Backend API */}
        {eventLoading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl shadow-sm border border-gray-100 my-6">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800">
              Đang tải dữ liệu sự kiện...
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Vui lòng chờ trong giây lát.
            </p>
          </div>
        )}

        {/* State 2: Fallback UI khi gặp lỗi hoặc không tìm thấy Event */}
        {!eventLoading && eventError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 my-6 text-center flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-rose-600 mb-3" />
            <h3 className="text-xl font-bold text-rose-900 mb-2">
              Không thể hiển thị sự kiện
            </h3>
            <p className="text-sm text-rose-700 max-w-md mb-6">{eventError}</p>
            <button
              onClick={() => fetchEventDetails(currentEventId)}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <RotateCcw size={16} />
              <span>Thử tải lại dữ liệu</span>
            </button>
          </div>
        )}

        {/* State 3: Hiển thị giao diện chính sau khi fetch dữ liệu thành công */}
        {!eventLoading && !eventError && event && (
          <>
            {/* Tiêu đề Sự kiện + Nút Bookmark (chỉ hiển thị với role Student) */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-2xl md:text-[28px] font-extrabold uppercase text-[#6D28D9] leading-snug max-w-3xl">
                {event.title || "Sự kiện không có tiêu đề"}
              </h1>
              {isStudent && (
                <BookmarkButton
                  saved={saved}
                  loading={bookmarkLoading}
                  onClick={handleToggleBookmark}
                />
              )}
            </div>

            {/* Banner Poster */}
            <EventPoster imageUrl={event.banner_url} title={event.title} />

            {/* Khung Thông tin chi tiết */}
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Chi tiết Sự kiện
            </h2>
            <EventDetails details={details} />

            {/* Mô tả sự kiện */}
            <EventDescription
              text={
                event.description || "Chưa có mô tả chi tiết cho sự kiện này."
              }
            />

            {/* Thanh đăng ký tham gia - Ban tổ chức chỉ xem, không đăng ký được */}
            {isOrganizer ? (
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl px-4 py-3">
                <Users size={18} className="text-purple-700" />
                <span>
                  {count}/{maxCapacity} sinh viên đã đăng ký · Ban tổ chức chỉ có
                  thể xem chi tiết sự kiện.
                </span>
              </div>
            ) : (
              <RegisterActionBar
                maxCapacity={maxCapacity}
                count={count}
                registered={registered}
                registerLoading={registerLoading}
                dataLoading={dataLoading}
                onRegister={handleRegister}
                feedback={feedback}
                user={user}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* Alias export for backward compatibility */
export const EventRegistrationPage = EventDetailPage;
