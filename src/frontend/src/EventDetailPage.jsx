import { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";
import Header from "./components/Header";
import { supabase } from "./lib/supabase";
import {
  Calendar,
  Users,
  MapPin,
  Tag,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  LogIn,
  RotateCcw,
} from "lucide-react";

// Event ID mặc định hiển thị trên UniEvent
const DEFAULT_EVENT_ID = "3ca6a6f4-39e3-4a97-aa87-0a0efac68562";
const FALLBACK_POSTER_IMAGE =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80";

/* =========================================================
   HÀM BỔ TRỢ: Định dạng Ngày & Giờ tiếng Việt (vi-VN)
   ========================================================= */

/**
 * Định dạng chuỗi ISO hoặc Date sang kiểu Ngày tiếng Việt (VD: "30 Tháng 5, 2026")
 */
function formatVietnameseDate(dateString) {
  if (!dateString) return "Chưa cập nhật";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day} Tháng ${month}, ${year}`;
  } catch (err) {
    console.error("Lỗi định dạng ngày:", err);
    return String(dateString);
  }
}

/**
 * Định dạng giờ sang chuẩn tiếng Việt (VD: "13:30 CHIỀU" hoặc "09:00 SÁNG")
 */
function formatVietnameseTime(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "CHIỀU" : "SÁNG";
    const formattedHours = hours.toString().padStart(2, "0");
    return `${formattedHours}:${minutes} ${period}`;
  } catch (err) {
    console.error("Lỗi định dạng giờ:", err);
    return "";
  }
}

/* =========================================================
   1. EventPoster Component - Xử lý ảnh & Fallback chuẩn
   ========================================================= */
export function EventPoster({ imageUrl, banner_url, title, alt }) {
  const posterSrc = imageUrl || banner_url;
  const [imgSrc, setImgSrc] = useState(posterSrc);

  useEffect(() => {
    setImgSrc(posterSrc);
  }, [posterSrc]);

  return (
    <div className="bg-[#EEE8F9] rounded-2xl p-5 flex justify-center mb-8 shadow-sm">
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={title || alt || "Event Poster"}
          className="w-full max-w-2xl rounded-xl object-cover shadow-md transition-all hover:shadow-lg aspect-[16/9]"
          onError={(e) => {
            console.warn("Poster image load failed, reverting to fallback:", imgSrc);
            if (e.target.src !== FALLBACK_POSTER_IMAGE) {
              e.target.onerror = null;
              setImgSrc(FALLBACK_POSTER_IMAGE);
            }
          }}
        />
      ) : (
        /* Khung hiển thị mặc định nếu chưa upload banner lên Supabase Storage */
        <div className="w-full max-w-2xl h-64 md:h-80 rounded-xl bg-purple-100 border-2 border-dashed border-purple-300 flex flex-col items-center justify-center text-purple-600 p-6 text-center">
          <svg
            className="w-12 h-12 mb-2 opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="font-semibold text-sm">Chưa có Banner cho sự kiện này</p>
          <p className="text-xs text-purple-400 mt-1">
            Cập nhật link banner vào cột banner_url trên Supabase Storage bucket 'event-banners'
          </p>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   2. Reusable DetailItem
   ========================================================= */
function DetailItem({ icon: Icon, label, value, subValue }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[11px] font-bold tracking-wide text-gray-500 uppercase mb-1">
          {label}
        </p>
        <p className="text-[15px] font-bold text-gray-900">{value}</p>
        {subValue && (
          <p className="text-[13px] text-gray-500 mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   3. Event Details Grid Component
   ========================================================= */
function EventDetails({ details }) {
  return (
    <div className="bg-[#EEE8F9] rounded-2xl px-6 md:px-8 py-7 grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-6 mb-6">
      {details.map((item, i) => (
        <DetailItem key={i} {...item} />
      ))}
    </div>
  );
}

/* =========================================================
   4. Event Description Component
   ========================================================= */
function EventDescription({ text }) {
  return (
    <div className="bg-[#EEE8F9] rounded-2xl px-6 md:px-8 py-7 text-[15px] leading-relaxed text-gray-700 mb-7 whitespace-pre-line">
      {text}
    </div>
  );
}

/* =========================================================
   5. Register Action Bar Component
   ========================================================= */
function RegisterActionBar({
  maxCapacity = 250,
  count = 0,
  registered = false,
  registerLoading = false,
  dataLoading = false,
  onRegister,
  feedback = { type: null, message: "" },
  user = null,
}) {
  const isFull = count >= maxCapacity;

  return (
    <div className="flex flex-col gap-4">
      {/* Dynamic Feedback Banner */}
      {feedback.message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium transition-all shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : feedback.type === "warning"
              ? "bg-amber-50 text-amber-900 border border-amber-200"
              : feedback.type === "info"
              ? "bg-blue-50 text-blue-800 border border-blue-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.type === "success" && (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          )}
          {feedback.type === "warning" && (
            <LogIn className="w-5 h-5 shrink-0 text-amber-600" />
          )}
          {feedback.type === "info" && (
            <Info className="w-5 h-5 shrink-0 text-blue-600" />
          )}
          {feedback.type === "error" && (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <div className="flex-1">
            <span>{feedback.message}</span>
            {!user && feedback.type === "warning" && (
              <span className="block text-xs mt-0.5 text-amber-700 font-normal">
                Vui lòng đăng nhập tài khoản của bạn để tiến hành lưu đăng ký.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-4">
        {/* Live Registration Counter */}
        <div className="flex items-center gap-2 font-bold text-gray-900 text-[15px] justify-center md:justify-start bg-gray-100 md:bg-transparent py-2 px-4 rounded-lg md:p-0">
          {dataLoading ? (
            <span className="flex items-center gap-1.5 text-gray-500 font-normal">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> Đang
              tải lượt đăng ký...
            </span>
          ) : (
            <>
              <span
                className={
                  isFull ? "text-rose-600 font-extrabold" : "text-gray-900"
                }
              >
                {count}/{maxCapacity}
              </span>
              <Users size={18} className="text-purple-700" />
            </>
          )}
        </div>

        {/* Register Button */}
        <button
          onClick={onRegister}
          disabled={registered || registerLoading || isFull}
          className={`font-bold text-[15px] rounded-xl px-8 py-3.5 transition-all flex items-center justify-center gap-2 shadow-sm ${
            registered
              ? "bg-emerald-600 text-white cursor-not-allowed"
              : isFull
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : registerLoading
              ? "bg-purple-500 text-white cursor-wait opacity-90"
              : "bg-purple-700 hover:bg-purple-800 text-white hover:shadow-md active:scale-[0.99]"
          }`}
        >
          {registerLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : registered ? (
            <>
              <span>Đã đăng ký ✓</span>
            </>
          ) : isFull ? (
            <span>Hết chỗ</span>
          ) : (
            <>
              <span>Đăng kí ngay</span>
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   6. EventDetailPage Component (Dynamic Page based on route /events/:eventId)
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
   7. Main App Entry Point with React Router v6
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
