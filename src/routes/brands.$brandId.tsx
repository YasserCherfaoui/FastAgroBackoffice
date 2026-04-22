import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
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
import { useToast } from "#/components/ui/toast"
import {
  deleteBrand,
  fetchBrand,
  fetchBrands,
  updateBrand,
  uploadBrandImage,
} from "#/lib/api"
import { filterParentBrandOptions } from "#/lib/brand-parent-options"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  parent_id: z.string(),
})

type FormValues = z.infer<typeof schema>

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export const Route = createFileRoute("/brands/$brandId")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: EditBrandPage,
})

function EditBrandPage() {
  const { brandId } = Route.useParams()
  const id = Number.parseInt(brandId, 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const brandQuery = useQuery({
    queryKey: ["brand", id],
    queryFn: () => fetchBrand(id),
    enabled: Number.isFinite(id),
  })
  const allBrandsQuery = useQuery({
    queryKey: ["brands", "all-for-parent"],
    queryFn: () => fetchBrands({ page: 1, perPage: 500 }),
  })
  const parentChoices = useMemo(() => {
    const items = allBrandsQuery.data?.items ?? []
    if (!Number.isFinite(id)) return items
    return filterParentBrandOptions(items, id)
  }, [allBrandsQuery.data?.items, id])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", parent_id: "" },
  })

  useEffect(() => {
    if (!brandQuery.data) return
    reset({
      name: brandQuery.data.name,
      slug: brandQuery.data.slug,
      parent_id: brandQuery.data.parent_id != null ? String(brandQuery.data.parent_id) : "",
    })
  }, [brandQuery.data, reset])

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateBrand(id, {
        name: values.name.trim(),
        slug: values.slug.trim(),
        parent_id: values.parent_id === "" ? null : Number.parseInt(values.parent_id, 10),
      }),
    onSuccess: () => {
      showToast("success", "Brand updated.")
      void queryClient.invalidateQueries({ queryKey: ["brand", id] })
      void queryClient.invalidateQueries({ queryKey: ["brands"] })
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void allBrandsQuery.refetch()
    },
    onError: (err) => {
      showToast("error", err instanceof Error ? err.message : "Failed to update brand.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteBrand(id),
    onSuccess: () => {
      showToast("success", "Brand deleted.")
      void queryClient.invalidateQueries({ queryKey: ["brands"] })
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void navigate({ to: "/brands" })
    },
    onError: (err) => {
      showToast("error", err instanceof Error ? err.message : "Failed to delete brand.")
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadBrandImage(id, file),
    onSuccess: () => {
      showToast("success", "Image uploaded.")
      void queryClient.invalidateQueries({ queryKey: ["brand", id] })
      void queryClient.invalidateQueries({ queryKey: ["brands"] })
    },
    onError: (err) => {
      showToast("error", err instanceof Error ? err.message : "Upload failed.")
    },
  })

  if (!Number.isFinite(id)) {
    return (
      <main className="page-wrap px-4 py-10">
        <p className="text-destructive">Invalid brand.</p>
      </main>
    )
  }

  const data = brandQuery.data

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <p className="island-kicker mb-2">
          <Link to="/brands" className="text-(--lagoon-deep) no-underline hover:underline">
            Brands
          </Link>
        </p>
        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-(--sea-ink) text-2xl">Edit brand</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Parent links cannot contain cycles.
            </CardDescription>
          </CardHeader>
          {brandQuery.isLoading ? (
            <CardContent>
              <p className="text-(--sea-ink-soft) text-sm">Loading…</p>
            </CardContent>
          ) : brandQuery.isError ? (
            <CardContent>
              <p className="text-destructive text-sm" role="alert">
                {brandQuery.error instanceof Error ? brandQuery.error.message : "Failed to load"}
              </p>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit((values) => updateMutation.mutate(values))} noValidate>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="eb-name">Name</Label>
                  <Input id="eb-name" aria-invalid={!!errors.name} {...register("name")} />
                  {errors.name ? (
                    <p className="text-destructive text-sm" role="alert">
                      {errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="eb-slug">Slug</Label>
                  <Input id="eb-slug" aria-invalid={!!errors.slug} {...register("slug")} />
                  {errors.slug ? (
                    <p className="text-destructive text-sm" role="alert">
                      {errors.slug.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="eb-parent">Parent brand</Label>
                  <select
                    id="eb-parent"
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
                    disabled={allBrandsQuery.isLoading}
                    {...register("parent_id")}
                  >
                    <option value="">None (root)</option>
                    {parentChoices.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                      window.confirm("Delete this brand? Products and child brands will be unlinked.")
                    ) {
                      deleteMutation.mutate()
                    }
                  }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </Button>
                <div className="ml-auto flex gap-3">
                  <Button type="button" variant="outline" asChild>
                    <Link to="/brands">Back</Link>
                  </Button>
                  <Button
                    type="submit"
                    className="bg-(--lagoon-deep) text-white hover:bg-(--lagoon-deep)/90"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>

        {data ? (
          <Card className="border-(--line) bg-(--surface-strong)">
            <CardHeader>
              <CardTitle className="text-lg">Brand image</CardTitle>
              <CardDescription>
                Upload one image. Requires{" "}
                <code className="rounded bg-(--chip-bg) px-1 py-0.5 text-xs">GCS_BUCKET</code> on
                the API.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-img">Upload</Label>
                <Input
                  id="brand-img"
                  type="file"
                  accept="image/*"
                  disabled={uploadMutation.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadMutation.mutate(file)
                    e.target.value = ""
                  }}
                />
              </div>
              {uploadMutation.isError ? (
                <p className="text-destructive text-sm" role="alert">
                  {uploadMutation.error instanceof Error ? uploadMutation.error.message : "Upload failed"}
                </p>
              ) : null}
              {data.brand_image ? (
                <div className="flex flex-wrap gap-4">
                  <a
                    href={data.brand_image}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border border-(--line)"
                  >
                    <img
                      src={data.brand_image}
                      alt={data.image_file_name ?? data.name}
                      className="max-h-40 max-w-full object-cover"
                    />
                  </a>
                  <div className="min-w-0 flex-1 text-sm text-(--sea-ink-soft)">
                    <p className="font-medium text-(--sea-ink)">{data.image_file_name}</p>
                    <p className="mt-1">
                      {typeof data.image_size_bytes === "number" ? formatBytes(data.image_size_bytes) : null}
                      {data.image_content_type ? ` · ${data.image_content_type}` : null}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-(--sea-ink-soft)">No image yet.</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  )
}
