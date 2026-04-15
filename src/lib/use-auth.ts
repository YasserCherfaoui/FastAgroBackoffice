import { useMemo, useSyncExternalStore } from "react"

import {
  AUTH_USER_KEY,
  getAuthToken,
  subscribeAuth,
  type StoredUser,
} from "#/lib/auth-session"

export type AuthState = {
  isAuthenticated: boolean
  user: StoredUser | null
}

export function useAuth(): AuthState {
  const isAuthenticated = useSyncExternalStore(
    subscribeAuth,
    () => !!getAuthToken(),
    () => false,
  )
  const rawUser = useSyncExternalStore(
    subscribeAuth,
    () =>
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(AUTH_USER_KEY),
    () => null,
  )
  const user = useMemo<StoredUser | null>(() => {
    if (!rawUser) return null
    try {
      const parsed: unknown = JSON.parse(rawUser)
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "id" in parsed &&
        "email" in parsed &&
        "user_type" in parsed &&
        typeof (parsed as { user_type: unknown }).user_type === "string" &&
        typeof (parsed as StoredUser).email === "string"
      ) {
        return parsed as StoredUser
      }
    } catch {
      /* ignore invalid session payloads */
    }
    return null
  }, [rawUser])
  return useMemo(
    () => ({ isAuthenticated, user }),
    [isAuthenticated, user],
  )
}
