import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useFieldArray, useForm } from "react-hook-form"
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
import { useToast } from "#/components/ui/toast"
import { createProduct, fetchCategories } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((v) => !Number.isNaN(Number.parseFloat(v)), "Invalid number")
    .refine((v) => Number.parseFloat(v) >= 0, "Must be zero or greater"),
  specifications: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    }),
  ),
  category_id: z.string(),
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

export const Route = createFileRoute("/products/new")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: NewProductPage,
})

function NewProductPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const categoriesQuery = useQuery({
    queryKey: ["categories", "options"],
    queryFn: () => fetchCategories({ page: 1, perPage: 200 }),
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      specifications: [],
      category_id: "",
    },
  })
  const specsFieldArray = useFieldArray({
    control,
    name: "specifications",
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const price_cents = Math.round(Number.parseFloat(values.price) * 100)
      const category_id =
        values.category_id === ""
          ? null
          : Number.parseInt(values.category_id, 10)
      return createProduct({
        name: values.name.trim(),
        description: values.description,
        price_cents,
        category_id,
        specifications: values.specifications.map((spec) => ({
          key: spec.key.trim(),
          value: spec.value.trim(),
        })),
      })
    },
    onSuccess: (p) => {
      showToast("success", "Product created successfully.")
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void navigate({
        to: "/products/$productId",
        params: { productId: String(p.id) },
      })
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to create product.",
      )
    },
  })

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto max-w-lg">
        <p className="island-kicker mb-2">
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
              New product
            </CardTitle>
            <CardDescription className="text-[var(--sea-ink-soft)]">
              Name, description, and price. Add images after saving.
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-name">Name</Label>
                <Input
                  id="p-name"
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
                <Label htmlFor="p-desc">Description</Label>
                <Textarea id="p-desc" rows={4} {...register("description")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-category">Category</Label>
                <select
                  id="p-category"
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
                  Manage categories in{" "}
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
                <Label htmlFor="p-price">Price (USD)</Label>
                <Input
                  id="p-price"
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-invalid={!!errors.price}
                  {...register("price")}
                />
                {errors.price ? (
                  <p className="text-destructive text-sm" role="alert">
                    {errors.price.message}
                  </p>
                ) : null}
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
                <Link to="/products">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="bg-[var(--lagoon-deep)] text-white hover:bg-[var(--lagoon-deep)]/90"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving…" : "Create product"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
