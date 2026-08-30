import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { Link, useParams } from "react-router-dom";
import StudentHeader from "../components/common/StudentHeader.jsx";
import OrganizerHeader from "../components/common/OrganizerHeader.jsx";
import { supabase } from "../lib/supabase";
import { publicEventApi } from "../api/eventApi.js";
import {
  Calendar,
  Users,
  MapPin,
  Loader2,
  AlertCircle,
  CalendarX2,
  RotateCcw,
  ArrowLeft,
  Tag,
} from "lucide-react";
import { EventPoster } from "../components/EventDetail/EventPoster.jsx";
import { EventDetails } from "../components/EventDetail/EventDetails.jsx";
import { EventDescription } from "../components/EventDetail/EventDescription.jsx";
import { RegisterActionBar } from "../components/EventDetail/RegisterActionBar.jsx";
import { BookmarkButton } from "../components/EventDetail/BookmarkButton.jsx";
import { OrganizerSpotlight } from "../components/EventDetail/OrganizerSpotlight.jsx";
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
  const [isRegistrationFloating, setIsRegistrationFloating] = useState(false);
  const registrationAnchorRef = useRef(null);

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
          setRegistered(
            Boolean(status.registered) &&
              String(status.status || "").toUpperCase() !== "CANCELLED",
          );
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

  useEffect(() => {
    const registrationAnchor = registrationAnchorRef.current;
    if (!registrationAnchor || eventLoading || eventError) return undefined;

    let animationFrameId = null;

    const updateRegistrationPosition = () => {
      animationFrameId = null;
      const headerOffset = window.innerWidth >= 640 ? 88 : 72;
      const shouldFloat =
        window.scrollY > 0 &&
        registrationAnchor.getBoundingClientRect().top <= headerOffset;

      setIsRegistrationFloating((current) =>
        current === shouldFloat ? current : shouldFloat,
      );
    };

    const requestRegistrationUpdate = () => {
      if (animationFrameId === null) {
        animationFrameId = window.requestAnimationFrame(updateRegistrationPosition);
      }
    };

    window.addEventListener("scroll", requestRegistrationUpdate, { passive: true });
    window.addEventListener("resize", requestRegistrationUpdate);
    requestRegistrationUpdate();

    return () => {
      window.removeEventListener("scroll", requestRegistrationUpdate);
      window.removeEventListener("resize", requestRegistrationUpdate);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentEventId, eventError, eventLoading]);

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
          : result.is_waitlisted
            ? {
                type: "warning",
                message:
                  "Sự kiện đã hết chỗ chính thức. Bạn đã được thêm vào Danh sách chờ (WAITLISTED)!",
              }
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

  const schedule = event
    ? {
        icon: Calendar,
        items: [
          {
            label: "Bắt đầu",
            value: formatVietnameseDate(event.start_time),
            subValue: formatVietnameseTime(event.start_time),
          },
          {
            label: "Kết thúc",
            value: formatVietnameseDate(event.end_time),
            subValue: formatVietnameseTime(event.end_time),
          },
          {
            label: "Hạn đăng ký",
            value: formatVietnameseDate(event.registration_deadline),
            subValue: formatVietnameseTime(event.registration_deadline),
          },
        ],
      }
    : { icon: Calendar, items: [] };

  const details = event
    ? [
        {
          icon: Users,
          label: "Quy mô sự kiện",
          value: event.capacity
            ? `${event.capacity} Sinh viên`
            : "Không giới hạn",
          subValue: "Sức chứa tối đa",
          className: "col-span-1 bg-violet-50/70",
        },
        {
          icon: MapPin,
          label: "Địa điểm",
          value: event.location || "Chưa cập nhật địa điểm",
          subValue: "Thông tin địa điểm tổ chức",
          className: "col-span-1",
        },
      ]
    : [];

  const maxCapacity = event?.capacity ?? null;
  // Sự kiện đã huỷ vẫn mở được trang chi tiết (link trong thông báo huỷ trỏ về
  // đây), nhưng không được mời đăng ký nữa.
  const isCancelled =
    String(event?.event_status || "").toUpperCase() === "CANCELLED";

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#fafafa] font-inter text-[#21182c]">
      {/* Header Navigation */}
      {isOrganizer ? <OrganizerHeader /> : <StudentHeader />}

      <main className="w-full max-w-full overflow-x-clip">
        {/* ── Loading state ── */}
        {eventLoading && (
          <div className="mx-auto my-16 flex min-h-[55vh] max-w-4xl flex-col items-center justify-center px-6 text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-violet-50">
              <Loader2 className="size-9 animate-spin text-violet-600" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-900">
              Đang tải dữ liệu sự kiện...
            </h3>
            <p className="mt-2 text-sm text-slate-500">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {/* ── Error state ── */}
        {!eventLoading && eventError && (
          <div className="mx-auto my-16 flex min-h-[55vh] max-w-3xl flex-col items-center justify-center rounded-3xl border border-rose-100 bg-gradient-to-b from-rose-50 to-white p-10 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-rose-100">
              <AlertCircle className="size-8 text-rose-600" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-rose-950">
              Không thể hiển thị sự kiện
            </h3>
            <p className="mb-8 mt-3 max-w-md text-sm leading-6 text-rose-700">{eventError}</p>
            <button
              onClick={() => fetchEventDetails(currentEventId)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-6 py-3 font-semibold text-white shadow-md shadow-rose-300/30 transition hover:-translate-y-0.5 hover:bg-rose-800 active:translate-y-0"
            >
              <RotateCcw size={16} />
              <span>Thử tải lại dữ liệu</span>
            </button>
          </div>
        )}

        {/* ── Main content ── */}
        {!eventLoading && !eventError && event && (
          <>
            {/* ════ Hero / Header section ════ */}
            <div className="event-detail-hero relative overflow-hidden">
              {/* Decorative background */}
              <div aria-hidden="true" className="event-detail-hero-bg pointer-events-none absolute inset-0" />

              <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-8 md:px-8 md:pb-14 md:pt-10">
                {/* Back link */}
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur-sm transition hover:border-violet-400 hover:text-violet-900"
                >
                  <ArrowLeft className="size-4" />
                  Quay lại khám phá
                </Link>

                {/* Cancelled banner */}
                {isCancelled && (
                  <div
                    role="status"
                    className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-5 py-4 backdrop-blur-sm"
                  >
                    <CalendarX2 className="mt-0.5 size-5 shrink-0 text-rose-600" />
                    <div>
                      <p className="font-bold text-rose-950">Sự kiện này đã bị huỷ</p>
                      <p className="mt-1 text-sm leading-6 text-rose-700">
                        Ban tổ chức đã huỷ sự kiện nên không còn nhận đăng ký. Thông
                        tin bên dưới được giữ lại để bạn tra cứu. Lý do huỷ nằm
                        trong thông báo gửi tới bạn.
                      </p>
                    </div>
                  </div>
                )}

                {/* Category + title */}
                <div className="mt-6">
                  {event.category_name && (
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-violet-700">
                      <Tag size={12} strokeWidth={2.5} aria-hidden="true" />
                      {event.category_name}
                    </div>
                  )}
                  <h1 className="max-w-5xl font-manrope text-[clamp(2rem,4.5vw,4rem)] font-extrabold leading-[1.06] tracking-[-0.04em] text-[#21182c]">
                    {event.title || "Sự kiện không có tiêu đề"}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4 text-violet-500" aria-hidden="true" />
                      {event.location || "Địa điểm đang cập nhật"}
                    </span>
                  </div>
                </div>

                {/* Action bar anchor */}
                <div
                  ref={registrationAnchorRef}
                  className="mt-7 flex min-h-14 flex-wrap items-center gap-3"
                >
                  {!isCancelled && isStudent && (
                    <BookmarkButton
                      saved={saved}
                      loading={bookmarkLoading}
                      onClick={handleToggleBookmark}
                    />
                  )}
                  {!isCancelled && (
                    <div
                      className={
                        isRegistrationFloating
                          ? "pointer-events-none fixed bottom-5 right-4 z-40 sm:right-6 lg:bottom-auto lg:right-8 lg:top-28 2xl:right-12"
                          : "pointer-events-none"
                      }
                    >
                      {isOrganizer ? (
                        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-medium text-slate-500 shadow-sm backdrop-blur-sm">
                          <Users size={18} className="text-violet-600" />
                          <span>
                            {count}/{maxCapacity} đã đăng ký · Ban tổ chức chỉ xem chi tiết.
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
                          floating={isRegistrationFloating}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ════ Body ════ */}
            <div className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
              {/* Two-column layout: Poster + Info sidebar */}
              <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
                {/* Left: Poster — stretches to fill */}
                <div className="event-detail-poster-wrap min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
                  <EventPoster imageUrl={event.banner_url} title={event.title} />
                </div>

                {/* Right: Sidebar — sticky on desktop */}
                <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
                  {/* Info panel */}
                  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                      <h2 className="font-manrope text-lg font-bold tracking-[-0.02em] text-[#21182c]">
                        Thông tin sự kiện
                      </h2>
                    </div>
                    <div className="p-4">
                      <EventDetails schedule={schedule} details={details} />
                    </div>
                  </section>

                  {/* Organizer */}
                  <OrganizerSpotlight organizer={event.organizer} />
                </aside>
              </div>

              {/* Description — outside the grid so sticky sidebar doesn't overlap */}
              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-9">
                <EventDescription
                  key={event.event_id}
                  text={
                    event.description || "Chưa có mô tả chi tiết cho sự kiện này."
                  }
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* Alias export for backward compatibility */
export const EventRegistrationPage = EventDetailPage;
