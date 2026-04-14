import { useQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"

import { Button } from "#/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { fetchProducts } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

export const Route = createFileRoute("/products/")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: ProductsPage,
})

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function ProductsPage() {
  const q = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  })

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="island-kicker mb-1">Backoffice</p>
            <h1 className="m-0 text-3xl font-semibold text-[var(--sea-ink)]">
              Products
            </h1>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Manage catalog items and images.
            </p>
          </div>
          <Button
            asChild
            className="bg-[var(--lagoon-deep)] text-white hover:bg-[var(--lagoon-deep)]/90"
          >
            <Link to="/products/new">Add product</Link>
          </Button>
        </div>

        <Card className="border-[var(--line)] bg-[var(--surface-strong)]">
          <CardHeader>
            <CardTitle className="text-lg">All products</CardTitle>
            <CardDescription className="text-[var(--sea-ink-soft)]">
              Signed-in users only. Prices are stored in cents on the server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">Loading…</p>
            ) : q.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {q.error instanceof Error ? q.error.message : "Failed to load"}
              </p>
            ) : !q.data?.length ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                No products yet.{" "}
                <Link
                  to="/products/new"
                  className="font-medium text-[var(--lagoon-deep)] underline-offset-2 hover:underline"
                >
                  Create one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {q.data.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <Link
                        to="/products/$productId"
                        params={{ productId: String(p.id) }}
                        className="text-base font-semibold text-[var(--sea-ink)] no-underline hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-[var(--sea-ink-soft)]">
                        {formatMoney(p.price_cents)}
                        {p.images?.length
                          ? ` · ${p.images.length} image(s)`
                          : null}
                        {p.specifications?.length
                          ? ` · ${p.specifications.length} spec(s)`
                          : null}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/products/$productId"
                        params={{ productId: String(p.id) }}
                      >
                        Edit
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
