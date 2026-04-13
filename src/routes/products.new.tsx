import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { createProduct } from "#/lib/api"
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

export const Route = createFileRoute("/products/new")({
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: NewProductPage,
})

function NewProductPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", price: "" },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const price_cents = Math.round(Number.parseFloat(values.price) * 100)
      return createProduct({
        name: values.name.trim(),
        description: values.description,
        price_cents,
      })
    },
    onSuccess: (p) => {
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      void navigate({
        to: "/products/$productId",
        params: { productId: String(p.id) },
      })
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
