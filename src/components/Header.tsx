import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"

import { Button } from "#/components/ui/button"
import { clearAuthSession } from "#/lib/auth-session"
import { useAuth } from "#/lib/use-auth"
import ThemeToggle from "./ThemeToggle"

export default function Header() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return (
    <header className="bg-(--header-bg) sticky top-0 z-50 border-b border-(--line) px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="border-(--chip-line) bg-(--chip-bg) text-(--sea-ink) inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            Fast Agro
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
          <ThemeToggle />
        </div>

        <div className="order-3 flex w-full flex-wrap items-center justify-end gap-x-4 gap-y-2 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
          {isAuthenticated ? (
            <>
              <Link
                to="/products"
                className="nav-link"
                activeProps={{ className: "nav-link is-active" }}
              >
                Products
              </Link>
              <Link
                to="/categories"
                className="nav-link"
                activeProps={{ className: "nav-link is-active" }}
              >
                Categories
              </Link>
              <Link
                to="/orders"
                className="nav-link"
                activeProps={{ className: "nav-link is-active" }}
              >
                Orders
              </Link>
              {user?.email ? (
                <span
                  className="text-(--sea-ink-soft) hidden max-w-56 truncate text-xs font-normal sm:inline"
                  title={
                    user.full_name
                      ? `${user.full_name} · ${user.email}`
                      : user.email
                  }
                >
                  {user.full_name?.trim()
                    ? `${user.full_name} · ${user.email}`
                    : user.email}
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  clearAuthSession()
                  queryClient.clear()
                  void navigate({ to: "/" })
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Link
              to="/login"
              className="nav-link"
              activeProps={{ className: "nav-link is-active" }}
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
