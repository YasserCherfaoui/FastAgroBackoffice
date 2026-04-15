import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
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
import { createCategory } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string(),
  description: z.string(),
  sort_order: z
    .string()
    .min(1, "Sort order is required")
    .refine((v) => !Number.isNaN(Number.parseInt(v, 10)), "Invalid number"),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

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

  const {
    register,
    control,
    handleSubmit,
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

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createCategory({
        name: values.name.trim(),
        slug: values.slug.trim() || undefined,
        description: values.description,
        sort_order: Number.parseInt(values.sort_order, 10),
        is_active: values.is_active,
      }),
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
              Leave slug empty to generate from the name.
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
                <Label htmlFor="c-desc">Description</Label>
                <Textarea id="c-desc" rows={3} {...register("description")} />
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
