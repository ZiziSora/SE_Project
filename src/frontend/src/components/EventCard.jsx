import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";

import { publicEventApi } from "../api/eventApi.js";
import {
  resolveCategoryName,
  resolveOrganizerName,
} from "../utils/eventFormat.js";

/* ─── Helpers ──────────────────────────────────────────────── */

function formatEventDate(raw) {
  if (!raw) return "Thời gian chưa cập nhật";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;

  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const date = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time} · ${date}`;
}

function getRegistrationSignal(capacity, registeredCount, registrationDeadline) {
  if (registrationDeadline && new Date(registrationDeadline) < new Date()) {
    return {
      kind: "closed",
      label: "Đã đóng đăng ký",
      className: "text-slate-500",
    };
  }

  const maximum = Number(capacity);
  const registered = Number(registeredCount);

  if (!Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(registered)) {
    return null;
  }

  const remaining = Math.max(maximum - registered, 0);
  if (remaining === 0) {
    return { kind: "full", label: "Đã đầy", className: "text-rose-600" };
  }

  if (registered / maximum >= 0.85) {
    return {
      kind: "nearly-full",
      label: `Còn ${remaining} chỗ`,
      className: "text-amber-600",
    };
  }

  return null;
}

function getCapacityLabel(capacity, registeredCount) {
  const maximum = Number(capacity);
  const registered = Number(registeredCount);

  if (!Number.isFinite(maximum) || maximum <= 0) {
    return "Không giới hạn số lượng";
  }

  if (!Number.isFinite(registered)) {
    return `${maximum} chỗ`;
  }

  return `${registered}/${maximum} người đã đăng ký`;
}

/** 0–100 fill percentage for the capacity bar */
function getCapacityPercent(capacity, registeredCount) {
  const maximum = Number(capacity);
  const registered = Number(registeredCount);
  if (!Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(registered)) return null;
  return Math.min(100, Math.round((registered / maximum) * 100));
}

function hasRegisteredState(registrationStatus, isRegistered) {
  const normalizedStatus = String(registrationStatus || "").toUpperCase();
  return (
    isRegistered === true ||
    ["REGISTERED", "CONFIRMED", "ATTENDED"].includes(normalizedStatus)
  );
}

function getHighlightSignal(
  isRecommended,
  registrationSignal,
  registrationStatus,
  isRegistered,
) {
  if (isRecommended) {
    return {
      label: "Dành cho bạn",
      className: "bg-violet-600/90 text-white",
      dotColor: "bg-white/80",
    };
  }

  if (hasRegisteredState(registrationStatus, isRegistered)) {
    return {
      label: "Đã đăng ký",
      className: "bg-emerald-600/90 text-white",
      dotColor: "bg-white/80",
    };
  }

  if (registrationSignal?.kind === "full") {
    return {
      label: "Đã đầy",
      className: "bg-slate-900/80 text-white",
      dotColor: null,
    };
  }

  if (registrationSignal?.kind === "nearly-full") {
    return {
      label: "Sắp hết chỗ",
      className: "bg-amber-400/95 text-amber-950",
      dotColor: "bg-amber-700/60",
    };
  }

  return null;
}

/** Category → accent colour mapping for placeholder backgrounds */
const CATEGORY_COLORS = {
  "Học thuật": { from: "#6366f1", to: "#818cf8" },
  "Kỹ năng mềm": { from: "#0ea5e9", to: "#38bdf8" },
  "Việc làm": { from: "#10b981", to: "#34d399" },
  "Văn hóa - Nghệ thuật": { from: "#f59e0b", to: "#fbbf24" },
  "Tình nguyện": { from: "#ec4899", to: "#f472b6" },
  "Khởi nghiệp": { from: "#8b5cf6", to: "#a78bfa" },
};

const DEFAULT_GRADIENT = { from: "#7c3aed", to: "#a78bfa" };

/* ─── Component ─────────────────────────────────────────────── */

export default function EventCard({
  eventId,
  image,
  badgeText,
  title,
  faculty,
  date,
  location,
  category,
  capacity,
  registeredCount,
  registrationDeadline,
  registrationStatus,
  registration_status: registrationStatusFromApi,
  isRegistered,
  is_registered: isRegisteredFromApi,
  variant = "default",
  isFeatured = false,
  reason,
  role,
  canRegister = role !== "organizer",
  showRegisterButton: allowRegister = true,
  isRegistrationOpen = true,
  showOrganizer = true,
  event = {},
  registered: registeredProp = false,
  waitlisted: waitlistedProp = false,
  onUnsave,
  onRegistered,
}) {
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  const [countOverride, setCountOverride] = useState(null);
  const [registrationOverride, setRegistrationOverride] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const targetId = eventId || event.event_id;
  const handleCardClick = () => {
    if (targetId) {
      navigate(`/events/${targetId}`);
    }
  };

  const count =
    countOverride ?? (Number(registeredCount ?? event.registered_count) || 0);
  const registeredFromProps =
    registeredProp ||
      hasRegisteredState(
        registrationStatus ?? registrationStatusFromApi,
        isRegistered ?? isRegisteredFromApi,
      );
  const registered =
    registrationOverride?.registered ?? registeredFromProps;
  const waitlisted = registrationOverride?.waitlisted ?? waitlistedProp;

  const resolvedDate = date ?? event.start_time;
  const resolvedLocation = location ?? event.location;
  const resolvedCategory = category ?? resolveCategoryName(event);
  const resolvedFaculty = faculty ?? resolveOrganizerName(event);
  const resolvedCapacity = capacity ?? event.capacity;
  const resolvedDeadline =
    registrationDeadline ?? event.registration_deadline;
  const resolvedVariant = isFeatured ? "recommended-featured" : variant;
  const isRecommended = resolvedVariant.startsWith("recommended");
  const isFeaturedRecommendation =
    resolvedVariant === "recommended-featured" ||
    (resolvedVariant === "recommended" && isFeatured);
  const isCompactRecommendation = resolvedVariant === "recommended-compact";
  const displayTitle = title || "Tên sự kiện chưa cập nhật";

  const registrationSignal = getRegistrationSignal(
    resolvedCapacity,
    count,
    resolvedDeadline,
  );
  const showRegistrationButton =
    role !== "organizer" &&
    canRegister &&
    allowRegister &&
    isRegistrationOpen &&
    registrationSignal?.kind !== "closed";
  const highlightSignal = getHighlightSignal(
    isRecommended,
    registrationSignal,
    registrationStatus ?? registrationStatusFromApi,
    registered,
  );
  const hasCapacityData =
    resolvedCapacity !== undefined &&
    resolvedCapacity !== null &&
    resolvedCapacity !== "";
  const showCapacity = Boolean(
    !isCompactRecommendation && (registrationSignal || hasCapacityData),
  );
  const capacityPercent = getCapacityPercent(resolvedCapacity, count);

  const hasImage = image && !imageFailed;
  const catColors = CATEGORY_COLORS[resolvedCategory] || DEFAULT_GRADIENT;

  const handleRegister = async () => {
    if (submitting || registered) return;

    setSubmitting(true);
    try {
      const result = await publicEventApi.registerForEvent(targetId);
      const nextCount = Number(result.count);

      if (Number.isFinite(nextCount)) setCountOverride(nextCount);
      setRegistrationOverride({
        registered: true,
        waitlisted: Boolean(result.is_waitlisted),
      });

      if (result.already_registered) {
        toast.info("Bạn đã đăng ký sự kiện này từ trước.");
      } else if (result.is_waitlisted) {
        toast.warning(
          "Sự kiện đã hết chỗ. Bạn đã được thêm vào danh sách chờ.",
        );
      } else {
        toast.success("Đăng ký thành công! Bạn đã giữ được chỗ.");
      }

      onRegistered?.(targetId, result);
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        toast.warning("Vui lòng đăng nhập để đăng ký tham gia sự kiện.");
      } else {
        toast.error(
          error.response?.data?.detail ||
            "Đăng ký thất bại. Vui lòng thử lại sau.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const registerLabel = registered
    ? waitlisted
      ? "Đang chờ"
      : "Đã đăng ký"
    : registrationSignal?.kind === "full"
      ? "Vào danh sách chờ"
      : "Đăng ký ngay";

  /* Article wrapper */
  const articleClasses = [
    "event-discovery-card group h-full overflow-hidden rounded-2xl border bg-white cursor-pointer hover:border-violet-300 hover:shadow-md transition-all",
    isRecommended
      ? "event-discovery-card--recommended border-violet-200/70"
      : "border-slate-200/80",
    isFeaturedRecommendation ? "event-discovery-card--featured" : "",
    isCompactRecommendation
      ? "md:grid md:grid-cols-[8rem_minmax(0,1fr)]"
      : "flex flex-col",
  ]
    .filter(Boolean)
    .join(" ");

  /* Image container */
  const imageClasses = [
    "relative overflow-hidden",
    isFeaturedRecommendation
      ? "aspect-[16/10] min-h-56 lg:min-h-72"
      : isCompactRecommendation
        ? "aspect-[16/10] md:aspect-auto md:h-full md:min-h-0"
        : "aspect-[16/9]",
  ].join(" ");

  /* Content padding */
  const contentClasses = [
    "flex min-w-0 flex-1 flex-col",
    isFeaturedRecommendation ? "p-6" : "p-5",
  ].join(" ");

  return (
    <article className={articleClasses} onClick={handleCardClick}>
      {/* ── Image / Placeholder ── */}
      <Link
        to={`/events/${targetId}`}
        onClick={(e) => e.stopPropagation()}
        className={`${imageClasses} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-600`}
        aria-label={`Xem chi tiết ${displayTitle}`}
        tabIndex={-1}
      >
        {hasImage ? (
          <img
            src={image}
            alt=""
            className="event-discovery-image h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          /* Gradient placeholder with category icon */
          <span
            className="flex h-full min-h-36 flex-col items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${catColors.from} 0%, ${catColors.to} 100%)`,
            }}
          >
            <CalendarDays
              aria-hidden="true"
              size={isFeaturedRecommendation ? 42 : 32}
              strokeWidth={1.4}
              className="text-white/80"
            />
            {resolvedCategory && (
              <span className="text-xs font-semibold text-white/70">
                {resolvedCategory}
              </span>
            )}
          </span>
        )}

        {/* Subtle gradient overlay on real images for badge legibility */}
        {hasImage && (
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"
          />
        )}

        {/* Category badge — bottom-left */}
        {resolvedCategory && (
          <span className="event-card-badge absolute bottom-3 left-3 max-w-[70%] truncate rounded-lg px-2.5 py-1.5 text-xs font-semibold backdrop-blur-[3px]">
            {resolvedCategory}
          </span>
        )}

        {/* Highlight badge — top-right */}
        {highlightSignal && (
          <span
            className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold backdrop-blur-[3px] ${highlightSignal.className}`}
          >
            {highlightSignal.dotColor && (
              <span
                className={`size-1.5 rounded-full ${highlightSignal.dotColor}`}
              />
            )}
            {highlightSignal.label}
          </span>
        )}
      </Link>

      {/* ── Content area ── */}
      <div className={contentClasses}>
        {!resolvedCategory && badgeText && (
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            {badgeText}
          </p>
        )}

        {/* Title */}
        <Link
          to={`/events/${targetId}`}
          onClick={(e) => e.stopPropagation()}
          className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
        >
          <h3
            className={`event-discovery-title font-bold leading-[1.3] tracking-[-0.015em] text-slate-900 ${
              isFeaturedRecommendation
                ? "text-[1.7rem] sm:text-[1.85rem]"
                : isCompactRecommendation
                  ? "line-clamp-2 text-[1.05rem]"
                  : "line-clamp-2 text-[1.1rem]"
            }`}
          >
            {displayTitle}
          </h3>
        </Link>

        {/* AI reason */}
        {reason && isRecommended && (
          <p
            className={`flex items-start gap-1.5 text-violet-700 ${
              isFeaturedRecommendation
                ? "mt-3 text-[0.9375rem] font-medium leading-6"
                : "mt-2.5 text-[0.8125rem] leading-5"
            }`}
          >
            <Sparkles
              className="mt-0.5 shrink-0"
              size={13}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="line-clamp-2">{reason}</span>
          </p>
        )}

        {reason && !isRecommended && (
          <p className="mt-2 line-clamp-1 text-sm text-slate-500">{reason}</p>
        )}

        {/* Meta info */}
        <div
          className={`mt-4 space-y-2.5 text-[0.8125rem] leading-5 ${
            isCompactRecommendation ? "md:text-[0.775rem]" : ""
          }`}
        >
          {/* Date */}
          <p className="flex items-center gap-2 text-slate-600">
            <Clock
              className="shrink-0 text-violet-400"
              size={14}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="font-medium">{formatEventDate(resolvedDate)}</span>
          </p>

          {/* Location */}
          <p className="flex items-center gap-2 text-slate-500">
            <MapPin
              className="shrink-0 text-slate-400"
              size={14}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="line-clamp-1">
              {resolvedLocation || "Địa điểm chưa cập nhật"}
            </span>
          </p>

          {/* Organizer */}
          {showOrganizer && resolvedFaculty && (
            <p className="flex items-center gap-2 text-slate-500">
              <Building2
                className="shrink-0 text-slate-400"
                size={14}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="line-clamp-1">{resolvedFaculty}</span>
            </p>
          )}

          {/* Capacity with progress bar */}
          {showCapacity && (
            <div className="flex flex-col gap-1.5">
              <p className="flex items-center gap-2">
                <Users
                  className="shrink-0 text-slate-400"
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span
                  className={`text-[0.8125rem] font-medium ${
                    registrationSignal?.kind === "full"
                      ? "text-rose-600"
                      : registrationSignal?.kind === "nearly-full"
                        ? "text-amber-600"
                        : registrationSignal?.kind === "closed"
                          ? "text-slate-500"
                          : "text-slate-600"
                  }`}
                >
                  {registrationSignal?.label ||
                    getCapacityLabel(resolvedCapacity, count)}
                </span>
              </p>

              {/* Mini progress bar — only when we have numeric data */}
              {capacityPercent !== null && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      capacityPercent >= 100
                        ? "bg-rose-500"
                        : capacityPercent >= 85
                          ? "bg-amber-500"
                          : "bg-violet-500"
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                    role="progressbar"
                    aria-valuenow={capacityPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Tỷ lệ đăng ký"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action footer ── */}
        <div
          className={`mt-auto pt-4 ${
            isRecommended
              ? "border-t border-violet-100"
              : "border-t border-slate-100"
          }`}
        >
          {showRegistrationButton ? (
            /* Two-button layout */
            <div className="flex items-center gap-2">
              <Link
                to={`/events/${targetId}`}
                onClick={(e) => e.stopPropagation()}
                className={`event-detail-action inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 ${
                  isCompactRecommendation ? "text-xs" : ""
                }`}
              >
                Xem chi tiết
                <ArrowRight
                  className="event-detail-arrow"
                  size={14}
                  aria-hidden="true"
                />
              </Link>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegister();
                }}
                disabled={registered || submitting}
                className={`event-register-action ml-auto inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 disabled:cursor-default ${
                  registered
                    ? waitlisted
                      ? "border border-amber-200 bg-amber-50 text-amber-800"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : registrationSignal?.kind === "full"
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "bg-violet-700 text-white shadow-violet-300/40 hover:bg-violet-800"
                } ${
                  isCompactRecommendation
                    ? "min-h-9 px-3 text-xs"
                    : "min-h-10 px-4 text-sm"
                }`}
              >
                {submitting && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                {submitting ? "Đang xử lý" : registerLabel}
              </button>
            </div>
          ) : onUnsave ? (
            <div className="flex items-center gap-2">
              <Link
                to={`/events/${targetId}`}
                onClick={(e) => e.stopPropagation()}
                className="event-detail-action inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
              >
                Xem chi tiết
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnsave(targetId);
                }}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                Bỏ lưu
              </button>
            </div>
          ) : (
            /* Single "Xem chi tiết" — full width pill */
            <Link
              to={`/events/${targetId}`}
              onClick={(e) => e.stopPropagation()}
              className="event-detail-action group/link inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
            >
              Xem chi tiết
              <ArrowRight
                className="event-detail-arrow size-4"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

