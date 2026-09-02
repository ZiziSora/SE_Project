const STORAGE_KEY = "unievent.admin-review-session-stats";

const EMPTY_STATS = {
  approved: 0,
  rejected: 0,
};

function normalizeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export function getAdminReviewSessionStats() {
  if (typeof window === "undefined") return { ...EMPTY_STATS };

  try {
    const storedStats = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) || "null",
    );

    return {
      approved: normalizeCount(storedStats?.approved),
      rejected: normalizeCount(storedStats?.rejected),
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

export function recordAdminReviewDecision(action, currentStats) {
  const stats = currentStats ?? getAdminReviewSessionStats();
  const decisionKey = action === "approve" ? "approved" : "rejected";
  const nextStats = {
    approved: normalizeCount(stats.approved),
    rejected: normalizeCount(stats.rejected),
    [decisionKey]: normalizeCount(stats[decisionKey]) + 1,
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
  } catch {
    // React state still updates when browser storage is unavailable.
  }

  return nextStats;
}
