export const AUTH_TOKEN_KEY = "fastagro_auth_token"
export const AUTH_USER_KEY = "fastagro_auth_user"

const AUTH_CHANGE_EVENT = "fastagro-auth-change"

export type StoredUser = {
  id: number
  email: string
  user_type: "admin" | "customer" | string
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getAuthUser(): StoredUser | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
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
    /* ignore */
  }
  return null
}

export function saveAuthSession(token: string, user: StoredUser): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  notifyAuthChange()
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
  notifyAuthChange()
}

function notifyAuthChange(): void {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

/** Subscribe to login, logout, and cross-tab storage changes. */
export function subscribeAuth(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange()
  window.addEventListener(AUTH_CHANGE_EVENT, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken()
}
