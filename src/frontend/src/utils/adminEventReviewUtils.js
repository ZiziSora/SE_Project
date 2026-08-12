export function formatAdminReviewDate(value, options = {}) {
  if (!value) return "Chưa cập nhật";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }).format(new Date(value));
}

export function formatAdminReviewTime(value) {
  if (!value) return "Chưa cập nhật";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getAdminReviewStatusLabel(status) {
  const labels = {
    PENDING: "Đang chờ duyệt",
    APPROVED: "Đã phê duyệt",
    REJECTED: "Đã từ chối",
  };

  return labels[status] ?? status;
}

export function getBannerThemeClasses(theme) {
  const themes = {
    quantum: "from-[#101838] via-[#2a1555] to-[#091522]",
    hackathon: "from-[#091d2f] via-[#113e54] to-[#8f2d56]",
    ethics: "from-[#19192c] via-[#3f3155] to-[#b06652]",
    green: "from-[#082d2c] via-[#146052] to-[#c0a459]",
    career: "from-[#12223b] via-[#3457a1] to-[#d38d72]",
    music: "from-[#190e2a] via-[#6e1d62] to-[#db663e]",
  };

  return themes[theme] ?? themes.quantum;
}
