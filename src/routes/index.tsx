import { Link, createFileRoute } from "@tanstack/react-router"

import { Button } from "#/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { useAuth } from "#/lib/use-auth"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  const { isAuthenticated, user } = useAuth()

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      <div className="mx-auto max-w-xl">
        <p className="island-kicker mb-2">Backoffice</p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          Fast Agro
        </h1>
        <p className="mb-8 text-[var(--sea-ink-soft)]">
          {isAuthenticated
            ? "Manage your product catalog and images."
            : "Sign in to manage products and catalog images."}
        </p>

        <Card className="border-[var(--line)] bg-[var(--surface-strong)]">
          <CardHeader>
            <CardTitle className="text-lg">Where to go</CardTitle>
            <CardDescription className="text-[var(--sea-ink-soft)]">
              {isAuthenticated
                ? user?.email
                  ? `Signed in as ${user.email}.`
                  : "You're signed in."
                : "Product management requires an account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {isAuthenticated ? (
              <>
                <Button
                  asChild
                  className="bg-[var(--lagoon-deep)] text-white hover:bg-[var(--lagoon-deep)]/90"
                >
                  <Link to="/products">Products</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/categories">Categories</Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
