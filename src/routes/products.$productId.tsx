import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
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
import { Switch } from "#/components/ui/switch"
import { Textarea } from "#/components/ui/textarea"
import { useToast } from "#/components/ui/toast"
import {
  deleteProduct,
  fetchBrands,
  fetchCategories,
  fetchProduct,
  updateProduct,
  uploadProductImage,
} from "#/lib/api"
import { formatMoneyFromCents } from "#/lib/format-dzd"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((v) => !Number.isNaN(Number.parseFloat(v)), "Invalid number")
    .refine((v) => Number.parseFloat(v) >= 0, "Must be zero or greater"),
  tax_percent: z
    .string()
    .min(1, "Tax rate is required")
    .refine((v) => !Number.isNaN(Number.parseFloat(v)), "Invalid number")
    .refine((v) => {
      const n = Number.parseFloat(v)
      return n >= 0 && n <= 100
    }, "Must be between 0 and 100"),
  weight_kg: z
    .string()
    .min(1, "Weight is required")
    .refine((v) => !Number.isNaN(Number.parseFloat(v)), "Invalid number")
    .refine((v) => Number.parseFloat(v) > 0, "Must be greater than zero"),
  specifications: z.array(
    z.object({
      id: z.number().optional(),
      key: z.string(),
      value: z.string(),
    }),
  ),
  category_id: z.string(),
  brand_id: z.string(),
  best_seller: z.boolean(),
}).superRefine((data, ctx) => {
  const seen = new Set<string>()
  data.specifications.forEach((spec, index) => {
    const key = spec.key.trim()
    if (key.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specifications", index, "key"],
        message: "Key is required",
      })
      return
    }
    const normalized = key.toLowerCase()
    if (seen.has(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specifications", index, "key"],
        message: "Duplicate key",
      })
      return
    }
    seen.add(normalized)
  })
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute("/products/$productId")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: EditProductPage,
})

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
  const { showToast } = useToast()

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: Number.isFinite(id),
  })

  const categoriesQuery = useQuery({
    queryKey: ["categories", "options"],
    queryFn: () => fetchCategories({ page: 1, perPage: 200 }),
  })
  const brandsQuery = useQuery({
    queryKey: ["brands", "options"],
    queryFn: () => fetchBrands({ page: 1, perPage: 200 }),
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      tax_percent: "19",
      weight_kg: "1",
      specifications: [],
      category_id: "",
      brand_id: "",
      best_seller: false,
    },
  })
  const specsFieldArray = useFieldArray({
    control,
    name: "specifications",
  })

  useEffect(() => {
    if (!productQuery.data) return
    reset({
      name: productQuery.data.name,
      description: productQuery.data.description,
      price: (productQuery.data.price_cents / 100).toFixed(2),
      tax_percent: ((productQuery.data.tax_rate_bps ?? 1900) / 100).toString(),
      weight_kg: (productQuery.data.weight_kg ?? 1).toString(),
      category_id:
        productQuery.data.category_id != null
          ? String(productQuery.data.category_id)
          : "",
      brand_id:
        productQuery.data.brand_id != null ? String(productQuery.data.brand_id) : "",
      best_seller: productQuery.data.best_seller ?? false,
      specifications:
        productQuery.data.specifications?.map((spec) => ({
          id: spec.id,
          key: spec.spec_key,
          value: spec.spec_value,
        })) ?? [],
    })
  }, [productQuery.data, reset])

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const price_cents = Math.round(Number.parseFloat(values.price) * 100)
      const tax_rate_bps = Math.round(
        Number.parseFloat(values.tax_percent) * 100,
      )
      const weight_kg = Number.parseFloat(values.weight_kg)
      const category_id =
        values.category_id === ""
          ? null
          : Number.parseInt(values.category_id, 10)
      const brand_id =
        values.brand_id === "" ? null : Number.parseInt(values.brand_id, 10)
      return updateProduct(id, {
        name: values.name.trim(),
        description: values.description,
        price_cents,
        tax_rate_bps,
        weight_kg,
        best_seller: values.best_seller,
        category_id,
        brand_id,
        specifications: values.specifications.map((spec) => ({
          id: spec.id,
          key: spec.key.trim(),
          value: spec.value.trim(),
        })),
      })
    },
    onSuccess: () => {
      showToast("success", "Product updated successfully.")
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void queryClient.invalidateQueries({ queryKey: ["product", id] })
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to update product.",
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: () => {
      showToast("success", "Product deleted successfully.")
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void navigate({ to: "/products" })
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to delete product.",
      )
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(id, file),
    onSuccess: () => {
      showToast("success", "Image uploaded successfully.")
      void queryClient.invalidateQueries({ queryKey: ["product", id] })
      void queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to upload image.",
      )
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
                  <Label htmlFor="e-category">Category</Label>
                  <select
                    id="e-category"
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={categoriesQuery.isLoading}
                    {...register("category_id")}
                  >
                    <option value="">No category</option>
                    {(categoriesQuery.data?.items ?? []).map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--sea-ink-soft)]">
                    Manage in{" "}
                    <Link
                      to="/categories"
                      className="text-[var(--lagoon-deep)] font-medium underline-offset-2 hover:underline"
                    >
                      Categories
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-brand">Brand</Label>
                  <select
                    id="e-brand"
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={brandsQuery.isLoading}
                    {...register("brand_id")}
                  >
                    <option value="">No brand</option>
                    {(brandsQuery.data?.items ?? []).map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--sea-ink-soft)]">
                    Manage in{" "}
                    <Link
                      to="/brands"
                      className="text-[var(--lagoon-deep)] font-medium underline-offset-2 hover:underline"
                    >
                      Brands
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                  <div>
                    <Label htmlFor="e-best-seller" className="cursor-pointer">
                      Best seller
                    </Label>
                    <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">
                      Show on the storefront home “most ordered” section.
                    </p>
                  </div>
                  <Controller
                    name="best_seller"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="e-best-seller"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-price">Price (DZD)</Label>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="e-tax">TVA (%)</Label>
                    <Input
                      id="e-tax"
                      inputMode="decimal"
                      aria-invalid={!!errors.tax_percent}
                      {...register("tax_percent")}
                    />
                    {errors.tax_percent ? (
                      <p className="text-destructive text-sm" role="alert">
                        {errors.tax_percent.message}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--sea-ink-soft)]">
                        Per line on storefront checkout.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="e-weight">Weight per unit (kg)</Label>
                    <Input
                      id="e-weight"
                      inputMode="decimal"
                      aria-invalid={!!errors.weight_kg}
                      {...register("weight_kg")}
                    />
                    {errors.weight_kg ? (
                      <p className="text-destructive text-sm" role="alert">
                        {errors.weight_kg.message}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--sea-ink-soft)]">
                        Shown on cart and order totals.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Specifications</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        specsFieldArray.append({
                          id: undefined,
                          key: "",
                          value: "",
                        })
                      }
                    >
                      Add specification
                    </Button>
                  </div>
                  {specsFieldArray.fields.length === 0 ? (
                    <p className="text-xs text-[var(--sea-ink-soft)]">
                      No specifications added.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {specsFieldArray.fields.map((field, index) => (
                        <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <Input
                            placeholder="Key (e.g. Weight)"
                            aria-invalid={!!errors.specifications?.[index]?.key}
                            {...register(`specifications.${index}.key`)}
                          />
                          <Input
                            placeholder="Value (e.g. 5 kg)"
                            {...register(`specifications.${index}.value`)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => specsFieldArray.remove(index)}
                          >
                            Remove
                          </Button>
                          {errors.specifications?.[index]?.key ? (
                            <p className="text-destructive text-sm sm:col-span-3" role="alert">
                              {errors.specifications[index]?.key?.message}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {productQuery.data ? (
                  <p className="text-xs text-[var(--sea-ink-soft)]">
                    Listed: {formatMoneyFromCents(productQuery.data.price_cents)} · ID{" "}
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
