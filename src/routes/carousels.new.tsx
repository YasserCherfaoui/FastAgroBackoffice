import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"

import { Button } from "#/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { useToast } from "#/components/ui/toast"
import { createCarousel } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

export const Route = createFileRoute("/carousels/new")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: NewCarouselPage,
})

function NewCarouselPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const mutation = useMutation({
    mutationFn: () => createCarousel({}),
    onSuccess: (slide) => {
      showToast("success", "Slide created. Add an image, then you can set it active.")
      void queryClient.invalidateQueries({ queryKey: ["carousels"] })
      void navigate({ to: "/carousels/$carouselId", params: { carouselId: String(slide.id) } })
    },
    onError: (err) => {
      showToast("error", err instanceof Error ? err.message : "Failed to create slide.")
    },
  })

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto max-w-lg">
        <p className="island-kicker mb-2">
          <Link to="/carousels" className="text-(--lagoon-deep) no-underline hover:underline">
            Carousel
          </Link>
        </p>
        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-(--sea-ink) text-2xl">New carousel slide</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Creates a row you can edit to add copy, a call-to-action, and an image.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mutation.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {mutation.error instanceof Error ? mutation.error.message : "Failed"}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link to="/carousels">Cancel</Link>
            </Button>
            <Button
              type="button"
              className="bg-(--lagoon-deep) text-white hover:bg-(--lagoon-deep)/90"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating…" : "Create slide"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
