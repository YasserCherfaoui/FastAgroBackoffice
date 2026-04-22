import { useQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "#/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { fetchBrands } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const PAGE_SIZE = 12

export const Route = createFileRoute("/brands/")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: BrandsPage,
})

function BrandsPage() {
  const [page, setPage] = useState(1)
  const q = useQuery({
    queryKey: ["brands", page, PAGE_SIZE],
    queryFn: () => fetchBrands({ page, perPage: PAGE_SIZE }),
  })
  const items = q.data?.items ?? []
  const pagination = q.data?.pagination
  const totalPages = pagination?.total_pages ?? 1

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="island-kicker mb-1">Backoffice</p>
            <h1 className="text-(--sea-ink) m-0 text-3xl font-semibold">Brands</h1>
            <p className="text-(--sea-ink-soft) mt-1 text-sm">
              Manage product brands and parent-child brand groups.
            </p>
          </div>
          <Button asChild className="bg-(--lagoon-deep) text-white hover:bg-(--lagoon-deep)/90">
            <Link to="/brands/new">New brand</Link>
          </Button>
        </div>

        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-lg">All brands</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Parent links create hierarchical brand groups.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <p className="text-(--sea-ink-soft) text-sm">Loading…</p>
            ) : q.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {q.error instanceof Error ? q.error.message : "Failed to load"}
              </p>
            ) : !items.length ? (
              <p className="text-(--sea-ink-soft) text-sm">
                No brands yet.{" "}
                <Link
                  to="/brands/new"
                  className="text-(--lagoon-deep) font-medium underline-offset-2 hover:underline"
                >
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-md border border-(--line)">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-(--surface) text-(--sea-ink-soft)">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Parent</th>
                        <th className="px-4 py-3 font-medium">Image</th>
                        <th className="px-4 py-3 font-medium">Slug</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((b) => (
                        <tr key={b.id} className="border-t border-(--line)">
                          <td className="text-(--sea-ink) px-4 py-3 font-medium">
                            <Link
                              to="/brands/$brandId"
                              params={{ brandId: String(b.id) }}
                              className="no-underline hover:underline"
                            >
                              {b.name}
                            </Link>
                          </td>
                          <td className="text-(--sea-ink-soft) px-4 py-3">
                            {b.parent?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {b.brand_image ? (
                              <img
                                src={b.brand_image}
                                alt={b.name}
                                className="h-10 w-14 rounded border border-(--line) object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-(--sea-ink-soft) text-xs">—</span>
                            )}
                          </td>
                          <td className="text-(--sea-ink-soft) px-4 py-3 font-mono text-xs">
                            {b.slug}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild variant="outline" size="sm">
                              <Link to="/brands/$brandId" params={{ brandId: String(b.id) }}>
                                Edit
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-(--line) pt-4">
                  <p className="text-(--sea-ink-soft) text-sm">
                    Page {pagination?.page ?? 1} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.max(current - 1, 1))}
                      disabled={(pagination?.page ?? 1) <= 1 || q.isFetching}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                      disabled={(pagination?.page ?? 1) >= totalPages || q.isFetching}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
