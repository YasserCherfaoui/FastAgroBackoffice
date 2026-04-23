import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
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
  deleteCarousel,
  fetchCarousel,
  updateCarousel,
  uploadCarouselImage,
} from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const schema = z.object({
  title: z.string(),
  subtitle: z.string(),
  cta_text: z.string(),
  cta_url: z
    .string()
    .refine(
      (s) => {
        const t = s.trim()
        if (t === "") return true
        try {
          // eslint-disable-next-line no-new
          new URL(t)
          return true
        } catch {
          return false
        }
      },
      { message: "Enter a valid URL or leave empty" },
    ),
  sort_order: z
    .string()
    .min(1, "Sort order is required")
    .refine((v) => !Number.isNaN(Number.parseInt(v, 10)), "Invalid number"),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute("/carousels/$carouselId")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: EditCarouselPage,
})

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function hasImagePublicUrl(
  c: { image_public_url?: string; image_object_name?: string; image_bucket_name?: string } | undefined,
) {
  if (!c) return false
  if (c.image_public_url && c.image_public_url.trim() !== "") return true
  return Boolean(c.image_bucket_name && c.image_object_name)
}

function buildUpdatePayload(
  v: FormValues,
): {
  title?: string
  subtitle?: string
  cta_text?: string
  cta_url?: string
  sort_order: number
  is_active: boolean
} {
  const title = v.title.trim()
  const subtitle = v.subtitle.trim()
  const ctaText = v.cta_text.trim()
  const ctaUrl = v.cta_url.trim()
  return {
    sort_order: Number.parseInt(v.sort_order, 10),
    is_active: v.is_active,
    ...(title ? { title } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(ctaText ? { cta_text: ctaText } : {}),
    ...(ctaUrl ? { cta_url: ctaUrl } : {}),
  }
}

function EditCarouselPage() {
  const { carouselId } = Route.useParams()
  const id = Number.parseInt(carouselId, 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const slideQuery = useQuery({
    queryKey: ["carousel", id],
    queryFn: () => fetchCarousel(id),
    enabled: Number.isFinite(id),
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      subtitle: "",
      cta_text: "",
      cta_url: "",
      sort_order: "0",
      is_active: false,
    },
  })

  useEffect(() => {
    if (!slideQuery.data) return
    const c = slideQuery.data
    reset({
      title: c.title ?? "",
      subtitle: c.subtitle ?? "",
      cta_text: c.cta_text ?? "",
      cta_url: c.cta_url ?? "",
      sort_order: String(c.sort_order),
      is_active: c.is_active,
    })
  }, [slideQuery.data, reset])

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => updateCarousel(id, buildUpdatePayload(values)),
    onSuccess: () => {
      showToast("success", "Slide updated.")
      void queryClient.invalidateQueries({ queryKey: ["carousel", id] })
      void queryClient.invalidateQueries({ queryKey: ["carousels"] })
    },
    onError: (err) => {
      showToast("error", err instanceof Error ? err.message : "Failed to update slide.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCarousel(id),
    onSuccess: () => {
      showToast("success", "Slide deleted.")
      void queryClient.invalidateQueries({ queryKey: ["carousels"] })
      void navigate({ to: "/carousels" })
    },
    onError: (err) => {
      showToast("error", err instanceof Error ? err.message : "Failed to delete slide.")
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadCarouselImage(id, file),
    onSuccess: () => {
      showToast("success", "Image uploaded.")
      void queryClient.invalidateQueries({ queryKey: ["carousel", id] })
      void queryClient.invalidateQueries({ queryKey: ["carousels"] })
    },
    onError: (err) => {
      showToast("error", err instanceof Error ? err.message : "Upload failed.")
    },
  })

  if (!Number.isFinite(id)) {
    return (
      <main className="page-wrap px-4 py-10">
        <p className="text-destructive">Invalid slide.</p>
      </main>
    )
  }

  const data = slideQuery.data

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <p className="island-kicker mb-2">
          <Link to="/carousels" className="text-(--lagoon-deep) no-underline hover:underline">
            Carousel
          </Link>
        </p>
        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-(--sea-ink) text-2xl">Edit slide</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Upload an image before enabling Active (the API rejects active slides without an image).
            </CardDescription>
          </CardHeader>
          {slideQuery.isLoading ? (
            <CardContent>
              <p className="text-(--sea-ink-soft) text-sm">Loading…</p>
            </CardContent>
          ) : slideQuery.isError ? (
            <CardContent>
              <p className="text-destructive text-sm" role="alert">
                {slideQuery.error instanceof Error ? slideQuery.error.message : "Failed to load"}
              </p>
            </CardContent>
          ) : (
            <form
              onSubmit={handleSubmit((values) => {
                if (values.is_active && !hasImagePublicUrl(data)) {
                  showToast(
                    "error",
                    "Upload an image before setting this slide active.",
                  )
                  return
                }
                updateMutation.mutate(values)
              })}
              noValidate
            >
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-title">Title</Label>
                  <Input id="c-title" aria-invalid={!!errors.title} {...register("title")} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-sub">Subtitle</Label>
                  <Textarea
                    id="c-sub"
                    rows={3}
                    aria-invalid={!!errors.subtitle}
                    className="border-input bg-background min-h-20 rounded-md border px-3 py-2 text-sm"
                    {...register("subtitle")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-cta-text">CTA label</Label>
                  <Input id="c-cta-text" {...register("cta_text")} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-cta-url">CTA URL</Label>
                  <Input
                    id="c-cta-url"
                    type="url"
                    placeholder="https://"
                    aria-invalid={!!errors.cta_url}
                    {...register("cta_url")}
                  />
                  {errors.cta_url ? (
                    <p className="text-destructive text-sm" role="alert">
                      {errors.cta_url.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-sort">Sort order</Label>
                  <Input
                    id="c-sort"
                    inputMode="numeric"
                    aria-invalid={!!errors.sort_order}
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
                    <p className="text-(--sea-ink) m-0 text-sm font-medium">Active</p>
                    <p className="text-(--sea-ink-soft) m-0 text-xs">
                      Shown on the public catalogue when the slide has an image.
                    </p>
                  </div>
                  <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          if (checked && !hasImagePublicUrl(data)) {
                            showToast("error", "Upload an image before activating this slide.")
                            return
                          }
                          field.onChange(checked)
                        }}
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
                    if (typeof window !== "undefined" && window.confirm("Delete this slide?")) {
                      deleteMutation.mutate()
                    }
                  }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </Button>
                <div className="ml-auto flex gap-3">
                  <Button type="button" variant="outline" asChild>
                    <Link to="/carousels">Back</Link>
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
              <CardTitle className="text-lg">Slide image</CardTitle>
              <CardDescription>
                Required for an active slide. Upload requires{" "}
                <code className="rounded bg-(--chip-bg) px-1 py-0.5 text-xs">GCS_BUCKET</code> on
                the API.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="carousel-img">Upload</Label>
                <Input
                  id="carousel-img"
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
                      alt={data.image_file_name ?? "Slide"}
                      className="max-h-40 max-w-full object-cover"
                    />
                  </a>
                  <div className="min-w-0 flex-1 text-sm text-(--sea-ink-soft)">
                    <p className="font-medium text-(--sea-ink)">{data.image_file_name}</p>
                    <p className="mt-1">
                      {typeof data.image_size_bytes === "number"
                        ? formatBytes(data.image_size_bytes)
                        : null}
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
