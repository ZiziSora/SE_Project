export const AUTH_STORAGE_KEYS = [
  "access_token",
  "refresh_token",
  "user_id",
  "email",
  "role",
  "account_status",
  "can_manage_events",
]

export function clearStoredAuthentication() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
}
