import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "#/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "#/components/ui/card"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { useToast } from "#/components/ui/toast"
import { createBrand, fetchBrands } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string(),
  parent_id: z.string(),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute("/brands/new")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: NewBrandPage,
})

function NewBrandPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const brandsQuery = useQuery({
    queryKey: ["brands", "all-for-parent"],
    queryFn: () => fetchBrands({ page: 1, perPage: 500 }),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", parent_id: "" },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createBrand({
        name: values.name.trim(),
        slug: values.slug.trim() || undefined,
        parent_id: values.parent_id === "" ? null : Number.parseInt(values.parent_id, 10),
      }),
    onSuccess: (brand) => {
      showToast("success", "Brand created.")
      void queryClient.invalidateQueries({ queryKey: ["brands"] })
      void navigate({ to: "/brands/$brandId", params: { brandId: String(brand.id) } })
    },
    onError: (err) => {
      showToast("error", err instanceof Error ? err.message : "Failed to create brand.")
    },
  })

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto max-w-lg">
        <p className="island-kicker mb-2">
          <Link to="/brands" className="text-(--lagoon-deep) no-underline hover:underline">
            Brands
          </Link>
        </p>
        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-(--sea-ink) text-2xl">New brand</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-name">Name</Label>
                <Input id="b-name" aria-invalid={!!errors.name} {...register("name")} />
                {errors.name ? (
                  <p className="text-destructive text-sm" role="alert">
                    {errors.name.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-slug">Slug (optional)</Label>
                <Input id="b-slug" placeholder="e.g. acme-foods" {...register("slug")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-parent">Parent brand</Label>
                <select
                  id="b-parent"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
                  disabled={brandsQuery.isLoading}
                  {...register("parent_id")}
                >
                  <option value="">None (root)</option>
                  {(brandsQuery.data?.items ?? []).map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              {mutation.isError ? (
                <p className="text-destructive text-sm" role="alert">
                  {mutation.error instanceof Error ? mutation.error.message : "Failed to save"}
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild>
                <Link to="/brands">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="bg-(--lagoon-deep) text-white hover:bg-(--lagoon-deep)/90"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving…" : "Create brand"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
