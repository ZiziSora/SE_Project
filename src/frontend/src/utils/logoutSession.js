import { logout } from "../api/authApi.js"
import { supabase } from "../lib/supabase.js"
import { clearStoredAuthentication } from "./authStorage.js"

export async function logoutCurrentSession() {
  let logoutFailed = false

  try {
    await logout()
  } catch {
    logoutFailed = true
  }

  try {
    const { error } = await supabase.auth.signOut({ scope: "local" })
    logoutFailed = logoutFailed || Boolean(error)
  } catch {
    logoutFailed = true
  }

  clearStoredAuthentication()
  return { logoutFailed }
}
