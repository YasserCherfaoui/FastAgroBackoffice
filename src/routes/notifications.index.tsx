import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "#/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import {
  createOrderNotificationRecipient,
  deleteOrderNotificationRecipient,
  fetchOrderNotificationRecipients,
} from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

export const Route = createFileRoute("/notifications/")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: OrderNotificationsPage,
})

function OrderNotificationsPage() {
  const qc = useQueryClient()
  const [emailInput, setEmailInput] = useState("")

  const listQ = useQuery({
    queryKey: ["admin", "order-notification-recipients"],
    queryFn: fetchOrderNotificationRecipients,
  })

  const createM = useMutation({
    mutationFn: (email: string) => createOrderNotificationRecipient({ email }),
    onSuccess: () => {
      setEmailInput("")
      void qc.invalidateQueries({
        queryKey: ["admin", "order-notification-recipients"],
      })
    },
  })

  const deleteM = useMutation({
    mutationFn: (id: number) => deleteOrderNotificationRecipient(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "order-notification-recipients"],
      })
    },
  })

  const items = listQ.data?.items ?? []

  return (
    <main className="page-wrap py-8">
      <Card>
        <CardHeader>
          <CardTitle>Order notification emails</CardTitle>
          <CardDescription>
            When a customer places an order, these addresses receive one staff
            email (Bcc) with order details. Set{" "}
            <code className="rounded bg-(--surface) px-1 text-xs">
              ORDER_ADMIN_NOTIFY_TO
            </code>{" "}
            on the server for the visible To address. The customer always gets
            a separate confirmation email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              const v = emailInput.trim()
              if (!v) return
              createM.mutate(v)
            }}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="notify-email">Email address</Label>
              <Input
                id="notify-email"
                type="email"
                autoComplete="email"
                placeholder="ops@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={createM.isPending || !emailInput.trim()}
            >
              Add recipient
            </Button>
          </form>

          {createM.isError ? (
            <p className="text-sm text-red-700">
              {createM.error instanceof Error
                ? createM.error.message
                : "Could not add email."}
            </p>
          ) : null}

          {listQ.isLoading ? (
            <p className="text-sm text-(--sea-ink-soft)">Loading…</p>
          ) : null}
          {listQ.isError ? (
            <p className="text-sm text-red-700">
              {listQ.error instanceof Error
                ? listQ.error.message
                : "Failed to load recipients."}
            </p>
          ) : null}

          {!listQ.isLoading && !listQ.isError ? (
            <div className="overflow-x-auto rounded-md border border-(--line)">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-(--surface) text-(--sea-ink-soft)">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="text-(--sea-ink-soft) px-4 py-6 text-center"
                      >
                        No recipients yet. Add at least one to receive staff
                        order alerts (when Resend is configured on the API).
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className="border-t border-(--line)">
                        <td className="px-4 py-3 font-mono text-xs sm:text-sm">
                          {row.email}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deleteM.isPending}
                            onClick={() => deleteM.mutate(row.id)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
