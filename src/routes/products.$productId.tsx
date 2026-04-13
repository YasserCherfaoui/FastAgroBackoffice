import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "#/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { Textarea } from "#/components/ui/textarea"
import {
  deleteProduct,
  fetchProduct,
  updateProduct,
  uploadProductImage,
} from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((v) => !Number.isNaN(Number.parseFloat(v)), "Invalid number")
    .refine((v) => Number.parseFloat(v) >= 0, "Must be zero or greater"),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute("/products/$productId")({
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: EditProductPage,
})

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function EditProductPage() {
  const { productId } = Route.useParams()
  const id = Number.parseInt(productId, 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: Number.isFinite(id),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values:
      productQuery.data != null
        ? {
            name: productQuery.data.name,
            description: productQuery.data.description,
            price: (productQuery.data.price_cents / 100).toFixed(2),
          }
        : { name: "", description: "", price: "" },
  })

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const price_cents = Math.round(Number.parseFloat(values.price) * 100)
      return updateProduct(id, {
        name: values.name.trim(),
        description: values.description,
        price_cents,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void queryClient.invalidateQueries({ queryKey: ["product", id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void navigate({ to: "/products" })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(id, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product", id] })
      void queryClient.invalidateQueries({ queryKey: ["products"] })
    },
  })

  if (!Number.isFinite(id)) {
    return (
      <main className="page-wrap px-4 py-10">
        <p className="text-destructive">Invalid product.</p>
      </main>
    )
  }

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <p className="island-kicker">
          <Link
            to="/products"
            className="text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Products
          </Link>
        </p>

        <Card className="border-[var(--line)] bg-[var(--surface-strong)]">
          <CardHeader>
            <CardTitle className="text-2xl text-[var(--sea-ink)]">
              Edit product
            </CardTitle>
            <CardDescription className="text-[var(--sea-ink-soft)]">
              Update details or upload images (stored in GCS; metadata saved in
              the API).
            </CardDescription>
          </CardHeader>
          {productQuery.isLoading ? (
            <CardContent>
              <p className="text-sm text-[var(--sea-ink-soft)]">Loading…</p>
            </CardContent>
          ) : productQuery.isError ? (
            <CardContent>
              <p className="text-destructive text-sm" role="alert">
                {productQuery.error instanceof Error
                  ? productQuery.error.message
                  : "Failed to load"}
              </p>
            </CardContent>
          ) : (
            <form
              onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
              noValidate
            >
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-name">Name</Label>
                  <Input
                    id="e-name"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  {errors.name ? (
                    <p className="text-destructive text-sm" role="alert">
                      {errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-desc">Description</Label>
                  <Textarea id="e-desc" rows={4} {...register("description")} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-price">Price (USD)</Label>
                  <Input
                    id="e-price"
                    inputMode="decimal"
                    aria-invalid={!!errors.price}
                    {...register("price")}
                  />
                  {errors.price ? (
                    <p className="text-destructive text-sm" role="alert">
                      {errors.price.message}
                    </p>
                  ) : null}
                </div>
                {productQuery.data ? (
                  <p className="text-xs text-[var(--sea-ink-soft)]">
                    Listed: {formatMoney(productQuery.data.price_cents)} · ID{" "}
                    {productQuery.data.id}
                  </p>
                ) : null}
                {updateMutation.isError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {updateMutation.error instanceof Error
                      ? updateMutation.error.message
                      : "Update failed"}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3 sm:justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      window.confirm("Delete this product and its images?")
                    ) {
                      deleteMutation.mutate()
                    }
                  }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </Button>
                <div className="ml-auto flex gap-3">
                  <Button type="button" variant="outline" asChild>
                    <Link to="/products">Back</Link>
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[var(--lagoon-deep)] text-white hover:bg-[var(--lagoon-deep)]/90"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>

        <Card className="border-[var(--line)] bg-[var(--surface-strong)]">
          <CardHeader>
            <CardTitle className="text-lg">Images</CardTitle>
            <CardDescription>
              Upload one file at a time. Requires{" "}
              <code className="rounded bg-[var(--chip-bg)] px-1 py-0.5 text-xs">
                GCS_BUCKET
              </code>{" "}
              on the API.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="img-up">Upload image</Label>
              <Input
                id="img-up"
                type="file"
                accept="image/*"
                disabled={uploadMutation.isPending || productQuery.isLoading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                  e.target.value = ""
                }}
              />
            </div>
            {uploadMutation.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {uploadMutation.error instanceof Error
                  ? uploadMutation.error.message
                  : "Upload failed"}
              </p>
            ) : null}
            {productQuery.data?.images?.length ? (
              <ul className="space-y-4">
                {productQuery.data.images.map((img) => (
                  <li
                    key={img.id}
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex flex-wrap gap-4">
                      <a
                        href={img.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block shrink-0 overflow-hidden rounded border border-[var(--line)]"
                      >
                        <img
                          src={img.public_url}
                          alt={img.file_name}
                          className="h-24 w-24 object-cover"
                        />
                      </a>
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium text-[var(--sea-ink)]">
                          {img.file_name}
                        </p>
                        <p className="mt-1 text-[var(--sea-ink-soft)]">
                          {img.bucket_name} · {formatBytes(img.size_bytes)}
                          {img.content_type ? ` · ${img.content_type}` : null}
                        </p>
                        <p className="mt-1 break-all text-xs text-[var(--sea-ink-soft)]">
                          Object: {img.object_name}
                        </p>
                        <p className="break-all text-xs text-[var(--sea-ink-soft)]">
                          URL: {img.public_url}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : productQuery.data ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                No images yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
