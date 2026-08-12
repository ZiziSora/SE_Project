import {
  ADMIN_REVIEW_BASE_SUMMARY,
  ADMIN_REVIEW_EVENTS,
  ADMIN_REVIEW_STORAGE_KEY,
} from "../data/adminReviewEvents.js";

function readDecisions() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(ADMIN_REVIEW_STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function getAdminReviewEvents() {
  const decisions = readDecisions();

  return ADMIN_REVIEW_EVENTS.map((event) => ({
    ...event,
    ...decisions[event.id],
  }));
}

export function getAdminReviewEvent(eventId) {
  return getAdminReviewEvents().find((event) => event.id === eventId) ?? null;
}

export function saveAdminReviewDecision(eventId, status, rejectionReason = "") {
  if (typeof window === "undefined") return;

  const decisions = readDecisions();
  decisions[eventId] = {
    status,
    rejectionReason,
    reviewedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    ADMIN_REVIEW_STORAGE_KEY,
    JSON.stringify(decisions),
  );
  window.dispatchEvent(new CustomEvent("unievent:admin-review-updated"));
}

export function getAdminReviewSummary(events) {
  const approvedDelta = events.filter(
    (event) => event.status === "APPROVED",
  ).length;
  const rejectedDelta = events.filter(
    (event) => event.status === "REJECTED",
  ).length;

  return {
    pending:
      ADMIN_REVIEW_BASE_SUMMARY.pending - approvedDelta - rejectedDelta,
    approved: ADMIN_REVIEW_BASE_SUMMARY.approved + approvedDelta,
    rejected: ADMIN_REVIEW_BASE_SUMMARY.rejected + rejectedDelta,
    total:
      ADMIN_REVIEW_BASE_SUMMARY.pending +
      ADMIN_REVIEW_BASE_SUMMARY.approved +
      ADMIN_REVIEW_BASE_SUMMARY.rejected,
  };
}
