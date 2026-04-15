import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
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
import { loginRequest, saveAuthSession } from "#/lib/api"
import { redirectIfAuthenticated } from "#/lib/require-auth"

const loginSchema = z.object({
  email: z.email({ message: "Enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: () => {
    redirectIfAuthenticated()
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      if (data.user.user_type !== "admin") {
        throw new Error("Backoffice access is restricted to admin accounts")
      }
      saveAuthSession(data.token, data.user)
      void navigate({ to: "/products" })
    },
  })

  return (
    <main className="page-wrap flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="border-(--line) bg-(--surface-strong) w-full max-w-md shadow-[0_24px_80px_rgba(23,58,64,0.12)]">
        <CardHeader>
          <p className="island-kicker mb-1">Backoffice</p>
          <CardTitle className="text-(--sea-ink) text-2xl">
            Sign in
          </CardTitle>
          <CardDescription className="text-(--sea-ink-soft)">
            Enter your Fast Agro backoffice credentials.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
          noValidate
        >
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-destructive text-sm" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-destructive text-sm" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            {loginMutation.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {loginMutation.error instanceof Error
                  ? loginMutation.error.message
                  : "Something went wrong"}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              className="bg-(--lagoon-deep) hover:bg-(--lagoon-deep)/90 w-full text-white sm:w-auto"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
