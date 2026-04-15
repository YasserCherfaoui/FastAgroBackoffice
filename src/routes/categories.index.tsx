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
import { fetchCategories } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const PAGE_SIZE = 12

function CategoryIconCell({ svg }: { svg?: string }) {
  if (!svg?.trim()) {
    return <span className="text-(--sea-ink-soft) text-xs">—</span>
  }
  return (
    <div
      className="text-(--sea-ink) flex h-8 w-8 items-center justify-center overflow-hidden [&_svg]:max-h-full [&_svg]:max-w-full"
      // Admin-only tool; SVG is validated server-side.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export const Route = createFileRoute("/categories/")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: CategoriesPage,
})

function CategoriesPage() {
  const [page, setPage] = useState(1)

  const q = useQuery({
    queryKey: ["categories", page, PAGE_SIZE],
    queryFn: () => fetchCategories({ page, perPage: PAGE_SIZE }),
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
            <h1 className="text-(--sea-ink) m-0 text-3xl font-semibold">
              Categories
            </h1>
            <p className="text-(--sea-ink-soft) mt-1 text-sm">
              Group products for the catalog and storefront.
            </p>
          </div>
          <Button
            asChild
            className="bg-(--lagoon-deep) text-white hover:bg-(--lagoon-deep)/90"
          >
            <Link to="/categories/new">New category</Link>
          </Button>
        </div>

        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-lg">All categories</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Parent links build a tree for navigation; icons and cover images
              are optional storefront assets.
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
                No categories yet.{" "}
                <Link
                  to="/categories/new"
                  className="text-(--lagoon-deep) font-medium underline-offset-2 hover:underline"
                >
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-md border border-(--line)">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-(--surface) text-(--sea-ink-soft)">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Parent</th>
                        <th className="px-4 py-3 font-medium">Icon</th>
                        <th className="px-4 py-3 font-medium">Image</th>
                        <th className="px-4 py-3 font-medium">Slug</th>
                        <th className="px-4 py-3 font-medium">Sort</th>
                        <th className="px-4 py-3 font-medium">Active</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((c) => (
                        <tr key={c.id} className="border-t border-(--line)">
                          <td className="text-(--sea-ink) px-4 py-3 font-medium">
                            <Link
                              to="/categories/$categoryId"
                              params={{ categoryId: String(c.id) }}
                              className="no-underline hover:underline"
                            >
                              {c.name}
                            </Link>
                          </td>
                          <td className="text-(--sea-ink-soft) max-w-[10rem] truncate px-4 py-3 text-xs">
                            {c.parent?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <CategoryIconCell svg={c.icon_svg} />
                          </td>
                          <td className="px-4 py-3">
                            {c.image_public_url ? (
                              <img
                                src={c.image_public_url}
                                alt=""
                                className="h-10 w-14 rounded border border-(--line) object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-(--sea-ink-soft) text-xs">
                                —
                              </span>
                            )}
                          </td>
                          <td className="text-(--sea-ink-soft) px-4 py-3 font-mono text-xs">
                            {c.slug}
                          </td>
                          <td className="text-(--sea-ink-soft) px-4 py-3">
                            {c.sort_order}
                          </td>
                          <td className="text-(--sea-ink-soft) px-4 py-3">
                            {c.is_active ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild variant="outline" size="sm">
                              <Link
                                to="/categories/$categoryId"
                                params={{ categoryId: String(c.id) }}
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
                      onClick={() =>
                        setPage((current) => Math.max(current - 1, 1))
                      }
                      disabled={(pagination?.page ?? 1) <= 1 || q.isFetching}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((current) =>
                          Math.min(current + 1, totalPages),
                        )
                      }
                      disabled={
                        (pagination?.page ?? 1) >= totalPages || q.isFetching
                      }
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
