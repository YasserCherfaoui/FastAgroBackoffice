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
import { fetchCarousels } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const PAGE_SIZE = 12

export const Route = createFileRoute("/carousels/")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: CarouselsPage,
})

function labelForRow(item: { title?: string; id: number }) {
  const t = item.title?.trim()
  if (t) return t
  return `Slide #${item.id}`
}

function CarouselsPage() {
  const [page, setPage] = useState(1)
  const q = useQuery({
    queryKey: ["carousels", page, PAGE_SIZE],
    queryFn: () => fetchCarousels({ page, perPage: PAGE_SIZE }),
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
            <h1 className="text-(--sea-ink) m-0 text-3xl font-semibold">Carousel</h1>
            <p className="text-(--sea-ink-soft) mt-1 text-sm">
              Home carousel slides: image, optional title, subtitle, and CTA.
            </p>
          </div>
          <Button asChild className="bg-(--lagoon-deep) text-white hover:bg-(--lagoon-deep)/90">
            <Link to="/carousels/new">New slide</Link>
          </Button>
        </div>

        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-lg">All slides</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Sort order is ascending. Only slides with an image can be set active in the API.
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
                No slides yet.{" "}
                <Link
                  to="/carousels/new"
                  className="text-(--lagoon-deep) font-medium underline-offset-2 hover:underline"
                >
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-md border border-(--line)">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-(--surface) text-(--sea-ink-soft)">
                      <tr>
                        <th className="px-4 py-3 font-medium">Preview</th>
                        <th className="px-4 py-3 font-medium">Title</th>
                        <th className="px-4 py-3 font-medium">Order</th>
                        <th className="px-4 py-3 font-medium">Active</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => (
                        <tr key={row.id} className="border-t border-(--line)">
                          <td className="px-4 py-3">
                            {row.image_public_url ? (
                              <img
                                src={row.image_public_url}
                                alt=""
                                className="h-10 w-20 rounded border border-(--line) object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-(--sea-ink-soft) text-xs">No image</span>
                            )}
                          </td>
                          <td className="text-(--sea-ink) px-4 py-3 font-medium">
                            <Link
                              to="/carousels/$carouselId"
                              params={{ carouselId: String(row.id) }}
                              className="no-underline hover:underline"
                            >
                              {labelForRow(row)}
                            </Link>
                          </td>
                          <td className="text-(--sea-ink-soft) px-4 py-3 tabular-nums">
                            {row.sort_order}
                          </td>
                          <td className="px-4 py-3">
                            {row.is_active ? (
                              <span className="text-(--lagoon-deep) text-xs font-medium">Yes</span>
                            ) : (
                              <span className="text-(--sea-ink-soft) text-xs">No</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild variant="outline" size="sm">
                              <Link
                                to="/carousels/$carouselId"
                                params={{ carouselId: String(row.id) }}
                              >
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
