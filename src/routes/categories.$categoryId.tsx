import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"
import { useEffect, useMemo } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
  deleteCategory,
  fetchCategories,
  fetchCategory,
  updateCategory,
  uploadCategoryImage,
} from "#/lib/api"
import { filterParentCategoryOptions } from "#/lib/category-parent-options"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const iconSnippet = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string(),
  sort_order: z
    .string()
    .min(1, "Sort order is required")
    .refine((v) => !Number.isNaN(Number.parseInt(v, 10)), "Invalid number"),
  is_active: z.boolean(),
  icon_svg: z.string().max(100000, "SVG must be at most 100KB"),
  parent_id: z.string(),
  color_hex: z
    .string()
    .refine(
      (s) => {
        const t = s.trim()
        return t === "" || /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(t)
      },
      "Use #RGB or #RRGGBB (or leave empty)",
    ),
})

type FormValues = z.infer<typeof schema>

function hexForNativeColorInput(raw: string | undefined): string {
  const t = (raw ?? "").trim()
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t.toLowerCase()
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const r = t[1]!
    const g = t[2]!
    const b = t[3]!
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return "#90a4ae"
}

export const Route = createFileRoute("/categories/$categoryId")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: EditCategoryPage,
})

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Client-side guard aligned with API rules (no script). */
function canPreviewSvg(markup: string): boolean {
  const lower = markup.trim().toLowerCase()
  if (!lower.includes("<svg")) return false
  if (lower.includes("<script") || lower.includes("javascript:")) return false
  return true
}

function SvgMarkupPreview({ markup }: { markup: string }) {
  const trimmed = markup.trim()
  if (!trimmed) {
    return (
      <p className="text-(--sea-ink-soft) m-0 text-sm">
        Preview appears here when you paste SVG markup below.
      </p>
    )
  }
  if (!canPreviewSvg(trimmed)) {
    return (
      <p className="text-destructive m-0 text-sm" role="alert">
        Preview hidden: markup must include{" "}
        <code className="rounded bg-(--chip-bg) px-0.5">&lt;svg&gt;</code> and
        must not contain scripts.
      </p>
    )
  }
  return (
    <div
      className="text-(--sea-ink) flex min-h-[88px] items-center justify-center [&_svg]:max-h-24 [&_svg]:max-w-full"
      // Backoffice-only; server validates on save.
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  )
}

function EditCategoryPage() {
  const { categoryId } = Route.useParams()
  const id = Number.parseInt(categoryId, 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const categoryQuery = useQuery({
    queryKey: ["category", id],
    queryFn: () => fetchCategory(id),
    enabled: Number.isFinite(id),
  })

  const allCategoriesQuery = useQuery({
    queryKey: ["categories", "all-for-parent"],
    queryFn: () => fetchCategories({ page: 1, perPage: 500 }),
  })

  const parentChoices = useMemo(() => {
    const items = allCategoriesQuery.data?.items ?? []
    if (!Number.isFinite(id)) return items
    return filterParentCategoryOptions(items, id)
  }, [allCategoriesQuery.data?.items, id])

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      sort_order: "0",
      is_active: true,
      icon_svg: "",
      color_hex: "",
      parent_id: "",
    },
  })

  const colorHexWatch = useWatch({
    control,
    name: "color_hex",
    defaultValue: "",
  })

  const iconSvgWatch = useWatch({
    control,
    name: "icon_svg",
    defaultValue: "",
  })

  useEffect(() => {
    if (!categoryQuery.data) return
    const c = categoryQuery.data
    reset({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      sort_order: String(c.sort_order),
      is_active: c.is_active,
      icon_svg: c.icon_svg ?? "",
      color_hex: c.color_hex ?? "",
      parent_id: c.parent_id != null ? String(c.parent_id) : "",
    })
  }, [categoryQuery.data, reset])

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateCategory(id, {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description,
        sort_order: Number.parseInt(values.sort_order, 10),
        is_active: values.is_active,
        icon_svg: values.icon_svg,
        color_hex: values.color_hex.trim(),
        parent_id:
          values.parent_id === ""
            ? null
            : Number.parseInt(values.parent_id, 10),
      }),
    onSuccess: () => {
      showToast("success", "Category updated.")
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      void queryClient.invalidateQueries({ queryKey: ["category", id] })
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void allCategoriesQuery.refetch()
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to update category.",
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(id),
    onSuccess: () => {
      showToast("success", "Category deleted.")
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void navigate({ to: "/categories" })
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to delete category.",
      )
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadCategoryImage(id, file),
    onSuccess: () => {
      showToast("success", "Image uploaded.")
      void queryClient.invalidateQueries({ queryKey: ["category", id] })
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Upload failed.",
      )
    },
  })

  if (!Number.isFinite(id)) {
    return (
      <main className="page-wrap px-4 py-10">
        <p className="text-destructive">Invalid category.</p>
      </main>
    )
  }

  const data = categoryQuery.data

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <p className="island-kicker mb-2">
          <Link
            to="/categories"
            className="text-(--lagoon-deep) no-underline hover:underline"
          >
            Categories
          </Link>
        </p>
        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-(--sea-ink) text-2xl">
              Edit category
            </CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Changing the slug may affect storefront URLs. Set a parent for
              navigation trees (no cycles).
            </CardDescription>
          </CardHeader>
          {categoryQuery.isLoading ? (
            <CardContent>
              <p className="text-(--sea-ink-soft) text-sm">Loading…</p>
            </CardContent>
          ) : categoryQuery.isError ? (
            <CardContent>
              <p className="text-destructive text-sm" role="alert">
                {categoryQuery.error instanceof Error
                  ? categoryQuery.error.message
                  : "Failed to load"}
              </p>
            </CardContent>
          ) : (
            <form
              onSubmit={handleSubmit((values) =>
                updateMutation.mutate(values),
              )}
              noValidate
            >
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ec-name">Name</Label>
                  <Input
                    id="ec-name"
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
                  <Label htmlFor="ec-slug">Slug</Label>
                  <Input
                    id="ec-slug"
                    aria-invalid={!!errors.slug}
                    {...register("slug")}
                  />
                  {errors.slug ? (
                    <p className="text-destructive text-sm" role="alert">
                      {errors.slug.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ec-parent">Parent category</Label>
                  <select
                    id="ec-parent"
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
                    disabled={allCategoriesQuery.isLoading}
                    {...register("parent_id")}
                  >
                    <option value="">None (root)</option>
                    {parentChoices.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ec-desc">Description</Label>
                  <Textarea
                    id="ec-desc"
                    rows={3}
                    {...register("description")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ec-color-text">Chip color</Label>
                  <p className="text-(--sea-ink-soft) m-0 text-xs">
                    Hex color for the category chip on storefront product cards.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      id="ec-color"
                      type="color"
                      className="border-(--line) h-10 w-14 shrink-0 cursor-pointer rounded border bg-transparent p-0"
                      aria-label="Pick chip color"
                      value={hexForNativeColorInput(colorHexWatch)}
                      onChange={(e) =>
                        setValue("color_hex", e.target.value, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    />
                    <Input
                      id="ec-color-text"
                      className="font-mono"
                      placeholder="#1b5e20"
                      autoComplete="off"
                      aria-invalid={!!errors.color_hex}
                      {...register("color_hex")}
                    />
                  </div>
                  {errors.color_hex ? (
                    <p className="text-destructive text-sm" role="alert">
                      {errors.color_hex.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <Label
                      id="ec-icon-heading"
                      className="text-base"
                    >
                      Icon (SVG)
                    </Label>
                    <p className="text-(--sea-ink-soft) mt-0.5 text-xs">
                      Check the preview, then open the panel below to edit or paste
                      markup.
                    </p>
                  </div>
                  <div
                    className="rounded-lg border border-(--line) bg-(--surface-strong) px-4 py-6"
                    role="region"
                    aria-labelledby="ec-icon-heading"
                  >
                    <p className="text-(--sea-ink-soft) mb-2 text-xs font-medium uppercase tracking-wide">
                      Preview
                    </p>
                    <SvgMarkupPreview markup={iconSvgWatch ?? ""} />
                  </div>
                  <details className="group rounded-lg border border-(--line) bg-(--surface) [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-(--sea-ink) outline-none hover:bg-(--surface-strong) focus-visible:ring-2 focus-visible:ring-(--lagoon-deep)/30">
                      <span>SVG code &amp; suggestions</span>
                      <ChevronDown
                        className="size-4 shrink-0 text-(--sea-ink-soft) transition-transform duration-200 group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <div className="space-y-3 border-t border-(--line) px-3 pb-3 pt-3">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="ec-icon">Markup</Label>
                        <Textarea
                          id="ec-icon"
                          rows={6}
                          className="font-mono text-xs"
                          placeholder="Paste &lt;svg&gt;…&lt;/svg&gt; markup"
                          aria-invalid={!!errors.icon_svg}
                          aria-describedby={
                            errors.icon_svg ? "ec-icon-error" : undefined
                          }
                          {...register("icon_svg")}
                        />
                        {errors.icon_svg ? (
                          <p
                            id="ec-icon-error"
                            className="text-destructive text-sm"
                            role="alert"
                          >
                            {errors.icon_svg.message}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-md border border-(--line) bg-(--surface-strong) p-3 text-xs text-(--sea-ink-soft)">
                        <p className="m-0 mb-2 font-medium text-(--sea-ink)">
                          Suggestions
                        </p>
                        <ul className="mb-3 list-disc space-y-1 pl-4">
                          <li>
                            Browse{" "}
                            <a
                              href="https://lucide.dev/icons/"
                              target="_blank"
                              rel="noreferrer"
                              className="text-(--lagoon-deep) underline"
                            >
                              Lucide
                            </a>
                            ,{" "}
                            <a
                              href="https://heroicons.com/"
                              target="_blank"
                              rel="noreferrer"
                              className="text-(--lagoon-deep) underline"
                            >
                              Heroicons
                            </a>
                            , or{" "}
                            <a
                              href="https://tabler.io/icons"
                              target="_blank"
                              rel="noreferrer"
                              className="text-(--lagoon-deep) underline"
                            >
                              Tabler Icons
                            </a>{" "}
                            — copy the SVG only (no{" "}
                            <code className="rounded bg-(--chip-bg) px-0.5">
                              &lt;script&gt;
                            </code>
                            ).
                          </li>
                          <li>
                            Use{" "}
                            <code className="rounded bg-(--chip-bg) px-0.5">
                              currentColor
                            </code>{" "}
                            for stroke/fill so the icon matches your theme.
                          </li>
                        </ul>
                        <p className="m-0 mb-1 text-(--sea-ink)">
                          Minimal example
                        </p>
                        <pre className="max-h-24 overflow-x-auto overflow-y-auto rounded border border-(--line) bg-[var(--surface)] p-2 text-[11px] leading-snug">
                          {iconSnippet}
                        </pre>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            void navigator.clipboard.writeText(iconSnippet)
                            showToast("success", "Copied example SVG.")
                          }}
                        >
                          Copy example
                        </Button>
                      </div>
                    </div>
                  </details>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ec-sort">Sort order</Label>
                  <Input
                    id="ec-sort"
                    inputMode="numeric"
                    {...register("sort_order")}
                  />
                  {errors.sort_order ? (
                    <p className="text-destructive text-sm" role="alert">
                      {errors.sort_order.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-(--line) bg-(--surface) px-3 py-2">
                  <div>
                    <Label htmlFor="ec-active" className="cursor-pointer">
                      Active
                    </Label>
                  </div>
                  <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="ec-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
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
                      window.confirm(
                        "Delete this category? Products and child categories will be unlinked from it.",
                      )
                    ) {
                      deleteMutation.mutate()
                    }
                  }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </Button>
                <div className="ml-auto flex gap-3">
                  <Button type="button" variant="outline" asChild>
                    <Link to="/categories">Back</Link>
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
              <CardTitle className="text-lg">Cover image</CardTitle>
              <CardDescription>
                Upload a banner or thumbnail for this category. Requires{" "}
                <code className="rounded bg-(--chip-bg) px-1 py-0.5 text-xs">
                  GCS_BUCKET
                </code>{" "}
                on the API.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cat-img">Upload</Label>
                <Input
                  id="cat-img"
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
                  {uploadMutation.error instanceof Error
                    ? uploadMutation.error.message
                    : "Upload failed"}
                </p>
              ) : null}
              {data.image_public_url ? (
                <div className="flex flex-wrap gap-4">
                  <a
                    href={data.image_public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border border-(--line)"
                  >
                    <img
                      src={data.image_public_url}
                      alt={data.image_file_name ?? "Category"}
                      className="max-h-40 max-w-full object-cover"
                    />
                  </a>
                  <div className="min-w-0 flex-1 text-sm text-(--sea-ink-soft)">
                    <p className="font-medium text-(--sea-ink)">
                      {data.image_file_name}
                    </p>
                    <p className="mt-1">
                      {typeof data.image_size_bytes === "number"
                        ? formatBytes(data.image_size_bytes)
                        : null}
                      {data.image_content_type
                        ? ` · ${data.image_content_type}`
                        : null}
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
