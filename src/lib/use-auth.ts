import { useMemo, useSyncExternalStore } from "react"

import {
  getAuthToken,
  getAuthUser,
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
  const user = useSyncExternalStore(
    subscribeAuth,
    () => getAuthUser(),
    () => null,
  )
  return useMemo(
    () => ({ isAuthenticated, user }),
    [isAuthenticated, user],
  )
}
