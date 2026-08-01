import { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import Header from "./components/Header";
import { supabase } from "./lib/supabase";
import { Calendar, Users, MapPin, Tag, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { EventPoster } from "./components/EventDetail/EventPoster";
import { EventDetails } from "./components/EventDetail/EventDetails";
import { EventDescription } from "./components/EventDetail/EventDescription";
import { RegisterActionBar } from "./components/EventDetail/RegisterActionBar";
import {
  DEFAULT_EVENT_ID,
  FALLBACK_POSTER_IMAGE,
  formatVietnameseDate,
  formatVietnameseTime,
} from "./components/EventDetail/eventDetailUtils";

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
  const [imageUrl, setImageUrl] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: "" });

  /**
   * 1. Query chi tiết thông tin Event từ bảng `events` theo `event_id`
   */
  const fetchEventDetails = useCallback(async (id) => {
    setEventLoading(true);
    setEventError(null);

    try {
      // Query bằng cột event_id (NOT id)
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("event_id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setEventError(`Không tìm thấy sự kiện với ID "${id}" trên hệ thống.`);
        setEvent(null);
      } else {
        setEvent(data);

        // Xử lý link ảnh banner từ Supabase Storage bucket 'event-banners' hoặc URL công khai
        const rawUrl = data.banner_url || data.poster_url || data.image_url;
        if (rawUrl) {
          if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
            setImageUrl(rawUrl);
          } else {
            // Lấy URL công khai từ Supabase Storage bucket 'event-banners'
            const { data: storagePublicData } = supabase.storage
              .from("event-banners")
              .getPublicUrl(rawUrl);
            setImageUrl(storagePublicData?.publicUrl || rawUrl);
          }
        } else {
          // Fallback: Check public bucket 'event-banners' theo ID sự kiện
          const { data: bucketFallback } = supabase.storage
            .from("event-banners")
            .getPublicUrl(`${id}.jpg`);
          setImageUrl(bucketFallback?.publicUrl || FALLBACK_POSTER_IMAGE);
        }
      }
    } catch (err) {
      console.error("Lỗi khi fetch chi tiết sự kiện từ Supabase:", err);
      setEventError(
        err.message || "Không thể kết nối đến cơ sở dữ liệu Supabase."
      );
    } finally {
      setEventLoading(false);
    }
  }, []);

  // Fetch Event khi currentEventId thay đổi
  useEffect(() => {
    fetchEventDetails(currentEventId);
  }, [currentEventId, fetchEventDetails]);

  // 2. Setup Supabase Auth listener
  useEffect(() => {
    let isMounted = true;

    async function checkCurrentUser() {
      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.warn("Supabase auth check notice:", error.message);
        }
        if (isMounted) {
          setUser(currentUser || null);
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

  // 3. Fetch Lượt đăng ký & trạng thái đăng ký của user hiện tại trên event_registrations
  useEffect(() => {
    let isMounted = true;

    async function fetchEventRegistrationData() {
      setDataLoading(true);
      try {
        const { count: totalRegistrations, error: countError } = await supabase
          .from("event_registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", currentEventId);

        if (countError) {
          console.error("Failed to count registrations:", countError.message);
        } else if (isMounted && totalRegistrations !== null) {
          setCount(totalRegistrations);
        }

        if (user) {
          const { data: existingReg, error: regError } = await supabase
            .from("event_registrations")
            .select("id")
            .eq("event_id", currentEventId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (regError) {
            console.error("Failed to check user registration:", regError.message);
          } else if (isMounted) {
            setRegistered(!!existingReg);
          }
        } else if (isMounted) {
          setRegistered(false);
        }
      } catch (err) {
        console.error("Error loading event data:", err);
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    }

    fetchEventRegistrationData();
  }, [currentEventId, user]);

  // 4. Xử lý nút Đăng ký tham gia
  const handleRegister = async () => {
    setFeedback({ type: null, message: "" });

    if (!user) {
      setFeedback({
        type: "warning",
        message: "Bạn chưa đăng nhập! Vui lòng đăng nhập để đăng ký tham gia sự kiện.",
      });
      return;
    }

    if (registered) return;

    setRegisterLoading(true);

    try {
      const { error: insertError } = await supabase
        .from("event_registrations")
        .insert([
          {
            user_id: user.id,
            event_id: currentEventId,
            registration_status: "registered",
          },
        ]);

      if (insertError) {
        if (insertError.code === "23505") {
          setRegistered(true);
          setFeedback({
            type: "info",
            message: "Bạn đã đăng ký sự kiện này từ trước!",
          });
        } else {
          setFeedback({
            type: "error",
            message: `Đăng ký thất bại: ${insertError.message || "Vui lòng thử lại sau."}`,
          });
        }
      } else {
        setCount((prevCount) => prevCount + 1);
        setRegistered(true);
        setFeedback({
          type: "success",
          message: "Đăng ký thành công! Bạn đã giữ được chỗ tham gia sự kiện.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: `Đã xảy ra lỗi: ${err?.message || "Không thể thực hiện đăng ký."}`,
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  // Map dữ liệu linh hoạt từ đối tượng event (Supabase) vào mảng chi tiết UI
  const details = event
    ? [
      {
        icon: Calendar,
        label: "Ngày & giờ bắt đầu",
        value: formatVietnameseDate(event.start_time || event.start_date),
        subValue: formatVietnameseTime(event.start_time || event.start_date),
      },
      {
        icon: Calendar,
        label: "Ngày & giờ kết thúc",
        value: formatVietnameseDate(event.end_time || event.end_date),
        subValue: formatVietnameseTime(event.end_time || event.end_date),
      },
      {
        icon: Calendar,
        label: "Hạn chót đăng ký",
        value: formatVietnameseDate(
          event.registration_deadline || event.deadline
        ),
        subValue: formatVietnameseTime(
          event.registration_deadline || event.deadline
        ),
      },
      {
        icon: Users,
        label: "Số lượng tham gia tối đa",
        value: `${event.capacity || event.max_capacity || 0} Sinh viên`,
      },
      {
        icon: MapPin,
        label: "Địa điểm",
        value: event.location || "Chưa cập nhật địa điểm",
      },
      {
        icon: Tag,
        label: "Lĩnh vực / Danh mục",
        value: event.category || event.topic || "Công nghệ Thông tin",
      },
    ]
    : [];

  const maxCapacity = event?.capacity || event?.max_capacity || 250;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <Header />

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-10 pb-20">
        {/* State 1: Fallback UI khi đang Loading dữ liệu từ Supabase */}
        {eventLoading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl shadow-sm border border-gray-100 my-6">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800">
              Đang tải dữ liệu sự kiện từ Supabase...
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
            {/* Tiêu đề Sự kiện */}
            <h1 className="text-2xl md:text-[28px] font-extrabold uppercase text-[#6D28D9] leading-snug mb-6 max-w-3xl">
              {event.title || event.name || "Sự kiện không có tiêu đề"}
            </h1>

            {/* Banner Poster */}
            <EventPoster
              imageUrl={imageUrl}
              banner_url={event.banner_url}
              title={event.title || event.name}
            />

            {/* Khung Thông tin chi tiết */}
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Chi tiết Sự kiện
            </h2>
            <EventDetails details={details} />

            {/* Mô tả sự kiện */}
            <EventDescription
              text={event.description || "Chưa có mô tả chi tiết cho sự kiện này."}
            />

            {/* Thanh đăng ký tham gia */}
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
          </>
        )}
      </main>
    </div>
  );
}

/* Alias export for backward compatibility */
export const EventRegistrationPage = EventDetailPage;

/* =========================================================
   Main App Entry Point with React Router v6
   ========================================================= */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route mặc định chuyển hướng sang sự kiện tiêu chuẩn */}
        <Route
          path="/"
          element={<Navigate to={`/events/${DEFAULT_EVENT_ID}`} replace />}
        />
        <Route
          path="/events"
          element={<Navigate to={`/events/${DEFAULT_EVENT_ID}`} replace />}
        />
        {/* Dynamic Route hiển thị chi tiết sự kiện theo eventId */}
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        {/* Catch-all fallback */}
        <Route
          path="*"
          element={<Navigate to={`/events/${DEFAULT_EVENT_ID}`} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
