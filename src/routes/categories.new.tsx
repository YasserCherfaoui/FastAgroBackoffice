import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
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
import { createCategory, fetchCategories } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const iconSnippet = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string(),
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

export const Route = createFileRoute("/categories/new")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: NewCategoryPage,
})

function NewCategoryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const categoriesQuery = useQuery({
    queryKey: ["categories", "all-for-parent"],
    queryFn: () => fetchCategories({ page: 1, perPage: 500 }),
  })

  const {
    register,
    control,
    handleSubmit,
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

  const colorHexWatch = useWatch({ control, name: "color_hex" })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const parent_id =
        values.parent_id === ""
          ? null
          : Number.parseInt(values.parent_id, 10)
      return createCategory({
        name: values.name.trim(),
        slug: values.slug.trim() || undefined,
        description: values.description,
        sort_order: Number.parseInt(values.sort_order, 10),
        is_active: values.is_active,
        icon_svg: values.icon_svg,
        color_hex: values.color_hex.trim() || undefined,
        parent_id,
      })
    },
    onSuccess: (c) => {
      showToast("success", "Category created.")
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      void navigate({
        to: "/categories/$categoryId",
        params: { categoryId: String(c.id) },
      })
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to create category.",
      )
    },
  })

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto max-w-lg">
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
              New category
            </CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Leave slug empty to generate from the name. You can upload a
              cover image after saving.
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-name">Name</Label>
                <Input
                  id="c-name"
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
                <Label htmlFor="c-slug">Slug (optional)</Label>
                <Input
                  id="c-slug"
                  placeholder="e.g. fruits-legumes"
                  {...register("slug")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-parent">Parent category</Label>
                <select
                  id="c-parent"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
                  disabled={categoriesQuery.isLoading}
                  {...register("parent_id")}
                >
                  <option value="">None (root)</option>
                  {(categoriesQuery.data?.items ?? []).map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-desc">Description</Label>
                <Textarea id="c-desc" rows={3} {...register("description")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-color-text">Chip color</Label>
                <p className="text-(--sea-ink-soft) m-0 text-xs">
                  Hex color for the category chip on storefront product cards.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id="c-color"
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
                    id="c-color-text"
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-icon">Icon (SVG)</Label>
                <Textarea
                  id="c-icon"
                  rows={5}
                  className="font-mono text-xs"
                  placeholder="Paste &lt;svg&gt;…&lt;/svg&gt; markup (optional)"
                  aria-invalid={!!errors.icon_svg}
                  {...register("icon_svg")}
                />
                {errors.icon_svg ? (
                  <p className="text-destructive text-sm" role="alert">
                    {errors.icon_svg.message}
                  </p>
                ) : null}
                <div className="rounded-md border border-(--line) bg-(--surface) p-3 text-xs text-(--sea-ink-soft)">
                  <p className="m-0 mb-2 font-medium text-(--sea-ink)">
                    Suggestions
                  </p>
                  <ul className="mb-3 list-disc space-y-1 pl-4">
                    <li>
                      Use{" "}
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
                      ,{" "}
                      <a
                        href="https://tabler.io/icons"
                        target="_blank"
                        rel="noreferrer"
                        className="text-(--lagoon-deep) underline"
                      >
                        Tabler
                      </a>{" "}
                      — copy SVG markup only.
                    </li>
                    <li>
                      Prefer{" "}
                      <code className="rounded bg-(--chip-bg) px-0.5">currentColor</code>{" "}
                      for theming.
                    </li>
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(iconSnippet)
                      showToast("success", "Copied example SVG.")
                    }}
                  >
                    Copy minimal circle example
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-sort">Sort order</Label>
                <Input
                  id="c-sort"
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
                  <Label htmlFor="c-active" className="cursor-pointer">
                    Active
                  </Label>
                  <p className="text-(--sea-ink-soft) mt-0.5 text-xs">
                    Inactive categories stay hidden from typical storefront
                    filters.
                  </p>
                </div>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="c-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              {mutation.isError ? (
                <p className="text-destructive text-sm" role="alert">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "Failed to save"}
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild>
                <Link to="/categories">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="bg-(--lagoon-deep) text-white hover:bg-(--lagoon-deep)/90"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving…" : "Create category"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
