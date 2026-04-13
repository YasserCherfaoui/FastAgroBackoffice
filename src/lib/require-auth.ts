import { redirect } from "@tanstack/react-router"

import { getAuthToken } from "#/lib/auth-session"

/** Require JWT in localStorage; redirect to login (client navigation only). */
export function redirectIfUnauthenticated(): void {
  if (typeof window !== "undefined" && !getAuthToken()) {
    throw redirect({ to: "/login" })
  }
}

/** If already signed in, skip login screen. */
export function redirectIfAuthenticated(): void {
  if (typeof window !== "undefined" && getAuthToken()) {
    throw redirect({ to: "/products" })
  }
}
