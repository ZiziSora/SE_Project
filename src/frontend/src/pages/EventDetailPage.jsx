import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { Link, useParams } from "react-router-dom";
import StudentHeader from "../components/common/StudentHeader.jsx";
import { supabase } from "../lib/supabase";
import { publicEventApi } from "../api/eventApi.js";
import {
  Calendar,
  Users,
  MapPin,
  Loader2,
  AlertCircle,
  RotateCcw,
  ArrowLeft,
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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-white font-inter text-[#21182c]">
      <StudentHeader />

      <main className="w-full max-w-full overflow-x-clip">
        {eventLoading && (
          <div className="mx-auto my-16 flex min-h-[55vh] max-w-6xl flex-col items-center justify-center rounded-[2rem] border border-violet-100 bg-white px-6 text-center shadow-sm">
            <Loader2 className="mb-5 size-11 animate-spin text-violet-700" />
            <h3 className="text-xl font-semibold text-[#21182c]">
              Đang tải dữ liệu sự kiện...
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Vui lòng chờ trong giây lát.
            </p>
          </div>
        )}

        {!eventLoading && eventError && (
          <div className="mx-auto my-16 flex min-h-[55vh] max-w-4xl flex-col items-center justify-center rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-center">
            <AlertCircle className="mb-4 size-12 text-rose-600" />
            <h3 className="mb-2 text-2xl font-semibold text-rose-950">
              Không thể hiển thị sự kiện
            </h3>
            <p className="mb-7 max-w-md text-sm leading-6 text-rose-700">{eventError}</p>
            <button
              onClick={() => fetchEventDetails(currentEventId)}
              className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-6 py-3 font-semibold text-white transition hover:bg-rose-800"
            >
              <RotateCcw size={16} />
              <span>Thử tải lại dữ liệu</span>
            </button>
          </div>
        )}

        {!eventLoading && !eventError && event && (
          <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 transition hover:text-violet-900"
            >
              <ArrowLeft className="size-4" />
              Quay lại khám phá
            </Link>

            <div className="mt-7">
              <div className="min-w-0">
                <h1 className="max-w-5xl text-[clamp(2.25rem,5vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-[#21182c]">
                  {event.title || "Sự kiện không có tiêu đề"}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 text-violet-700" />
                    {event.location || "Địa điểm đang cập nhật"}
                  </span>
                  <span className="hidden size-1 rounded-full bg-slate-300 sm:block" aria-hidden="true" />
                  <span className="font-medium text-violet-700">
                    {event.category_name || "Sự kiện sinh viên"}
                  </span>
                </div>
              </div>
            </div>

            <div
              ref={registrationAnchorRef}
              className="mt-6 flex min-h-16 flex-wrap items-center justify-end gap-3"
            >
              {isStudent && (
                <BookmarkButton
                  saved={saved}
                  loading={bookmarkLoading}
                  onClick={handleToggleBookmark}
                />
              )}
              <div
                className={
                  isRegistrationFloating
                    ? "pointer-events-none fixed bottom-5 right-4 z-40 sm:right-6 lg:bottom-auto lg:right-8 lg:top-28 2xl:right-12"
                    : "pointer-events-none"
                }
              >
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
              </div>
            </div>

            <div className="mt-7 grid grid-flow-dense items-stretch gap-6 lg:grid-cols-2">
              <div className="h-[clamp(21rem,72vw,35rem)] min-w-0 overflow-hidden rounded-3xl border border-slate-200 lg:h-auto">
                <EventPoster imageUrl={event.banner_url} title={event.title} />
              </div>

              <aside className="min-w-0 space-y-5">
                <section>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#21182c]">
                    Thông tin sự kiện
                  </h2>
                  <div className="mt-5">
                    <EventDetails schedule={schedule} details={details} />
                  </div>
                </section>

                <OrganizerSpotlight organizer={event.organizer} />
              </aside>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-9">
              <div className="min-w-0 max-w-4xl">
                <EventDescription
                  key={event.event_id}
                  text={
                    event.description || "Chưa có mô tả chi tiết cho sự kiện này."
                  }
                />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* Alias export for backward compatibility */
export const EventRegistrationPage = EventDetailPage;
