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
import { deleteCategory, fetchCategory, updateCategory } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string(),
  sort_order: z
    .string()
    .min(1, "Sort order is required")
    .refine((v) => !Number.isNaN(Number.parseInt(v, 10)), "Invalid number"),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute("/categories/$categoryId")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: EditCategoryPage,
})

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

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      sort_order: "0",
      is_active: true,
    },
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
      }),
    onSuccess: () => {
      showToast("success", "Category updated.")
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      void queryClient.invalidateQueries({ queryKey: ["category", id] })
      void queryClient.invalidateQueries({ queryKey: ["products"] })
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

  if (!Number.isFinite(id)) {
    return (
      <main className="page-wrap px-4 py-10">
        <p className="text-destructive">Invalid category.</p>
      </main>
    )
  }

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
              Edit category
            </CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Changing the slug may affect storefront URLs.
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
                  <Label htmlFor="ec-desc">Description</Label>
                  <Textarea
                    id="ec-desc"
                    rows={3}
                    {...register("description")}
                  />
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
                        "Delete this category? Products in this category will have their category cleared.",
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
      </div>
    </main>
  )
}
