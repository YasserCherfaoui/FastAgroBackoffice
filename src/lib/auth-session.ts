export const AUTH_TOKEN_KEY = "fastagro_auth_token"
export const AUTH_USER_KEY = "fastagro_auth_user"

const AUTH_CHANGE_EVENT = "fastagro-auth-change"

/** Matches serverside `services.AuthUser` JSON from login and register. */
export type AuthUser = {
  id: number
  email: string
  full_name: string
  company_name: string
  account_type: string
  rc_number?: string | null
  nif?: string | null
  state_id?: number | null
  state_name?: string
  country_name?: string
  wilaya?: string
  address: string
  phone: string
  user_type: string
}

export type StoredUser = AuthUser

/** Normalize API or legacy session payloads (older sessions may omit profile fields). */
export function normalizeStoredUser(parsed: unknown): StoredUser | null {
  if (typeof parsed !== "object" || parsed === null) return null
  const o = parsed as Record<string, unknown>
  if (
    typeof o.id !== "number" ||
    typeof o.email !== "string" ||
    typeof o.user_type !== "string"
  ) {
    return null
  }
  return {
    id: o.id,
    email: o.email,
    user_type: o.user_type,
    full_name: typeof o.full_name === "string" ? o.full_name : "",
    company_name: typeof o.company_name === "string" ? o.company_name : "",
    account_type: typeof o.account_type === "string" ? o.account_type : "",
    rc_number:
      o.rc_number === undefined
        ? undefined
        : o.rc_number === null || typeof o.rc_number === "string"
          ? o.rc_number
          : undefined,
    nif:
      o.nif === undefined
        ? undefined
        : o.nif === null || typeof o.nif === "string"
          ? o.nif
          : undefined,
    state_id:
      typeof o.state_id === "number"
        ? o.state_id
        : o.state_id === null
          ? null
          : undefined,
    state_name: typeof o.state_name === "string" ? o.state_name : undefined,
    country_name: typeof o.country_name === "string" ? o.country_name : undefined,
    wilaya: typeof o.wilaya === "string" ? o.wilaya : "",
    address: typeof o.address === "string" ? o.address : "",
    phone: typeof o.phone === "string" ? o.phone : "",
  }
}

/** Decode JWT payload `exp` (seconds since epoch). Returns null if missing or invalid. */
function jwtExpiresAtSeconds(token: string): number | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json) as { exp?: unknown }
    return typeof payload.exp === "number" ? payload.exp : null
  } catch {
    return null
  }
}

function isJwtExpired(token: string): boolean {
  const exp = jwtExpiresAtSeconds(token)
  if (exp == null) return true
  return Date.now() >= exp * 1000
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  if (!token) return null
  if (isJwtExpired(token)) {
    clearAuthSession()
    return null
  }
  return token
}

export function getAuthUser(): StoredUser | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return normalizeStoredUser(parsed)
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
