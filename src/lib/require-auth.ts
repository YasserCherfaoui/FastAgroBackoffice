import { redirect } from "@tanstack/react-router"

import { getAuthToken } from "#/lib/api"

/** Use in route `beforeLoad` to require a stored JWT (client-side only). */
export function redirectIfUnauthenticated(): void {
  if (typeof window !== "undefined" && !getAuthToken()) {
    throw redirect({ to: "/login" })
  }
}
