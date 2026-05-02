import { useQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Button } from "#/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { formatMoneyFromCents } from "#/lib/format-dzd"
import {
  fetchAllProducts,
  fetchBrands,
  fetchProducts,
  getStorefrontBaseUrl,
  type Product,
} from "#/lib/api"
import { productsToGoogleMerchantCsv } from "#/lib/google-merchant-csv"
import { useDebouncedValue } from "#/lib/use-debounced-value"
import { cn } from "#/lib/utils"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

export const Route = createFileRoute("/products/")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: ProductsPage,
})

type ProductView = "table" | "list" | "cards"
const PAGE_SIZE = 12

function ProductImageCarousel({
  product,
  className,
}: {
  product: Product
  className?: string
}) {
  const images = product.images ?? []
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [product.id, images.length])

  useEffect(() => {
    if (images.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length)
    }, 2500)
    return () => window.clearInterval(timer)
  }, [images])

  if (!images.length) {
    return (
      <div
        className={cn(
          "bg-(--surface-strong) text-(--sea-ink-soft) flex items-center justify-center rounded-md border border-(--line) text-xs",
          className,
        )}
      >
        No image
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden rounded-md border border-(--line)", className)}>
      <img
        src={images[index]?.public_url}
        alt={product.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {images.length > 1 ? (
        <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1">
          {images.map((img, dotIndex) => (
            <span
              key={img.id}
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-white/60",
                dotIndex === index && "bg-white",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProductsPage() {
  const [view, setView] = useState<ProductView>("table")
  const [page, setPage] = useState(1)
  const [brandFilter, setBrandFilter] = useState<string>("")
  const [searchInput, setSearchInput] = useState("")
  const searchQ = useDebouncedValue(searchInput, 320)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const storefrontBase = getStorefrontBaseUrl()

  useEffect(() => {
    setPage(1)
  }, [searchQ])

  const brandsQuery = useQuery({
    queryKey: ["brands", "options"],
    queryFn: () => fetchBrands({ page: 1, perPage: 500 }),
  })

  const q = useQuery({
    queryKey: ["products", page, PAGE_SIZE, brandFilter, searchQ],
    queryFn: () =>
      fetchProducts({
        page,
        perPage: PAGE_SIZE,
        brandId: brandFilter === "" ? null : Number.parseInt(brandFilter, 10),
        q: searchQ.trim() || undefined,
      }),
  })
  const items = q.data?.items ?? []
  const pagination = q.data?.pagination
  const totalItems = pagination?.total_items ?? 0
  const totalPages = pagination?.total_pages ?? 1

  async function handleExportCsv() {
    if (!storefrontBase) return
    setExportError(null)
    setIsExporting(true)
    try {
      const products = await fetchAllProducts()
      const csv = productsToGoogleMerchantCsv(products, storefrontBase)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `products-google-merchant-${new Date().toISOString().slice(0, 10)}.csv`
      a.rel = "noopener"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  function ProductMeta({
    priceCents,
    imageCount,
    specificationCount,
    categoryName,
    brandName,
  }: {
    priceCents: number
    imageCount: number
    specificationCount: number
    categoryName?: string | null
    brandName?: string | null
  }) {
    return (
      <p className="mt-0.5 text-sm text-(--sea-ink-soft)">
        {categoryName ? `${categoryName} · ` : null}
        {brandName ? `${brandName} · ` : null}
        {formatMoneyFromCents(priceCents)}
        {imageCount ? ` · ${imageCount} image(s)` : null}
        {specificationCount ? ` · ${specificationCount} spec(s)` : null}
      </p>
    )
  }

  function renderProducts() {
    if (view === "cards") {
      return (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-(--line) bg-(--surface) p-4"
            >
              <ProductImageCarousel product={p} className="mb-3 h-40 w-full" />
              <Link
                to="/products/$productId"
                params={{ productId: String(p.id) }}
                className="text-(--sea-ink) text-base font-semibold no-underline hover:underline"
              >
                {p.name}
              </Link>
              <ProductMeta
                priceCents={p.price_cents}
                imageCount={p.images?.length ?? 0}
                specificationCount={p.specifications?.length ?? 0}
                categoryName={p.category?.name}
                brandName={p.brand?.name}
              />
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link to="/products/$productId" params={{ productId: String(p.id) }}>
                    Edit
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )
    }

    if (view === "list") {
      return (
        <ul className="divide-y divide-(--line)">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ProductImageCarousel product={p} className="h-16 w-16 shrink-0" />
                <div className="min-w-0">
                  <Link
                    to="/products/$productId"
                    params={{ productId: String(p.id) }}
                    className="text-(--sea-ink) block truncate text-base font-semibold no-underline hover:underline"
                  >
                    {p.name}
                  </Link>
                  <ProductMeta
                    priceCents={p.price_cents}
                    imageCount={p.images?.length ?? 0}
                    specificationCount={p.specifications?.length ?? 0}
                    categoryName={p.category?.name}
                    brandName={p.brand?.name}
                  />
                </div>
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
      )
    }

    return (
      <div className="overflow-x-auto rounded-md border border-(--line)">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-(--surface) text-(--sea-ink-soft)">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Images</th>
              <th className="px-4 py-3 font-medium">Specs</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-(--line)">
                <td className="px-4 py-3">
                  <Link
                    to="/products/$productId"
                    params={{ productId: String(p.id) }}
                    className="text-(--sea-ink) font-semibold no-underline hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="text-(--sea-ink-soft) px-4 py-3">
                  {p.category?.name ?? "—"}
                </td>
                <td className="text-(--sea-ink-soft) px-4 py-3">
                  {p.brand?.name ?? "—"}
                </td>
                <td className="text-(--sea-ink-soft) px-4 py-3">
                  {formatMoneyFromCents(p.price_cents)}
                </td>
                <td className="text-(--sea-ink-soft) px-4 py-3">
                  {p.images?.[0]?.public_url ? (
                    <img
                      src={p.images[0].public_url}
                      alt={p.name}
                      className="h-12 w-12 rounded-md border border-(--line) object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs">No image</span>
                  )}
                </td>
                <td className="text-(--sea-ink-soft) px-4 py-3">
                  {p.specifications?.length ?? 0}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/products/$productId" params={{ productId: String(p.id) }}>
                      Edit
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="island-kicker mb-1">Backoffice</p>
            <h1 className="text-(--sea-ink) m-0 text-3xl font-semibold">
              Products
            </h1>
            <p className="text-(--sea-ink-soft) mt-1 text-sm">
              Manage catalog items and images.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!storefrontBase || isExporting}
              onClick={() => void handleExportCsv()}
              title={
                storefrontBase
                  ? "Download full catalog as CSV for Google Merchant"
                  : "Set VITE_STOREFRONT_URL in .env to enable export"
              }
            >
              {isExporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button
              asChild
              className="bg-(--lagoon-deep) text-white hover:bg-(--lagoon-deep)/90"
            >
              <Link to="/products/new">Add product</Link>
            </Button>
          </div>
        </div>
        {exportError ? (
          <p className="text-destructive text-sm" role="alert">
            {exportError}
          </p>
        ) : null}
        {!storefrontBase ? (
          <p className="text-(--sea-ink-soft) text-sm">
            CSV export needs{" "}
            <code className="text-xs">VITE_STOREFRONT_URL</code> (storefront
            origin) in your environment.
          </p>
        ) : null}

        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-lg">All products</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Signed-in users only. Prices are stored in cents on the server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Label htmlFor="products-search" className="sr-only">
                Search products
              </Label>
              <Input
                id="products-search"
                placeholder="Search by name or description…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-(--sea-ink-soft) text-sm">
                Showing {items.length} of {totalItems} products
              </p>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="products-brand-filter"
                  className="text-(--sea-ink-soft) text-xs font-medium"
                >
                  Brand
                </label>
                <select
                  id="products-brand-filter"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
                  value={brandFilter}
                  onChange={(e) => {
                    setBrandFilter(e.target.value)
                    setPage(1)
                  }}
                  disabled={brandsQuery.isLoading}
                >
                  <option value="">All brands</option>
                  {(brandsQuery.data?.items ?? []).map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="inline-flex items-center gap-1 rounded-md border border-(--line) bg-(--surface) p-1"
                role="tablist"
                aria-label="Choose products display mode"
              >
                {(["table", "list", "cards"] as ProductView[]).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "capitalize",
                      view === mode &&
                        "bg-(--lagoon-deep) text-white hover:bg-(--lagoon-deep)/90 hover:text-white",
                    )}
                    onClick={() => setView(mode)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
            {q.isLoading ? (
              <p className="text-(--sea-ink-soft) text-sm">Loading…</p>
            ) : q.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {q.error instanceof Error ? q.error.message : "Failed to load"}
              </p>
            ) : !items.length ? (
              <p className="text-(--sea-ink-soft) text-sm">
                {searchQ.trim() ? (
                  "No products match your search."
                ) : (
                  <>
                    No products yet.{" "}
                    <Link
                      to="/products/new"
                      className="text-(--lagoon-deep) font-medium underline-offset-2 hover:underline"
                    >
                      Create one
                    </Link>
                    .
                  </>
                )}
              </p>
            ) : (
              <div className="space-y-4">
                {renderProducts()}
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
                      onClick={() =>
                        setPage((current) => Math.min(current + 1, totalPages))
                      }
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
