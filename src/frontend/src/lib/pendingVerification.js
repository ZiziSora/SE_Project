const PENDING_VERIFICATION_KEY = "unievent_pending_verification";

export const savePendingVerification = (verificationState) => {
  if (verificationState) {
    localStorage.setItem(PENDING_VERIFICATION_KEY, verificationState);
  }
};

export const getPendingVerification = () =>
  localStorage.getItem(PENDING_VERIFICATION_KEY);

export const clearPendingVerification = () => {
  localStorage.removeItem(PENDING_VERIFICATION_KEY);
};
