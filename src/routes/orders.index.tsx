import { useQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { formatMoneyFromCents } from "#/lib/format-dzd"
import { fetchOrders } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

export const Route = createFileRoute("/orders/")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: OrdersPage,
})

function OrdersPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const [query, setQuery] = useState("")
  const [customerKind, setCustomerKind] = useState<"all" | "anonymous" | "registered">(
    "all",
  )

  const ordersQuery = useQuery({
    queryKey: ["orders", page, status, query, customerKind],
    queryFn: () =>
      fetchOrders({
        page,
        perPage: 12,
        status,
        q: query.trim(),
        anonymous:
          customerKind === "anonymous"
            ? true
            : customerKind === "registered"
              ? false
              : undefined,
      }),
  })

  const items = ordersQuery.data?.items ?? []
  const pagination = ordersQuery.data?.pagination
  const totalPages = pagination?.total_pages ?? 1

  return (
    <main className="page-wrap py-8">
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            Review incoming orders and drill into their fulfillment status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Search order number, customer, company..."
              className="h-10 rounded-md border border-(--line) bg-(--surface) px-3 text-sm"
            />
            <select
              value={customerKind}
              onChange={(event) => {
                setCustomerKind(event.target.value as "all" | "anonymous" | "registered")
                setPage(1)
              }}
              className="h-10 rounded-md border border-(--line) bg-(--surface) px-3 text-sm"
            >
              <option value="all">All customers</option>
              <option value="anonymous">Anonymous only</option>
              <option value="registered">Registered only</option>
            </select>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              className="h-10 rounded-md border border-(--line) bg-(--surface) px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {ordersQuery.isLoading ? (
            <p className="text-sm text-(--sea-ink-soft)">Loading orders...</p>
          ) : null}

          {ordersQuery.isError ? (
            <p className="text-sm text-red-700">
              {ordersQuery.error instanceof Error
                ? ordersQuery.error.message
                : "Failed to load orders."}
            </p>
          ) : null}

          {!ordersQuery.isLoading && !ordersQuery.isError ? (
            <div className="overflow-x-auto rounded-md border border-(--line)">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-(--surface) text-(--sea-ink-soft)">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((order) => (
                    <tr key={order.id} className="border-t border-(--line)">
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="m-0 font-semibold text-(--sea-ink)">
                            {order.order_number}
                          </p>
                          {order.user_id == null ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                              Anonymous
                            </span>
                          ) : null}
                        </div>
                        <p className="m-0 mt-1 text-xs text-(--sea-ink-soft)">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-(--sea-ink-soft)">
                        <p className="m-0 font-medium text-(--sea-ink)">
                          {order.customer_name}
                        </p>
                        <p className="m-0 mt-1 text-xs">{order.company_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-(--surface-strong) px-3 py-1 text-xs font-semibold capitalize">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-(--sea-ink-soft)">
                        {order.items?.length ?? 0}
                      </td>
                      <td className="px-4 py-3 text-(--sea-ink-soft)">
                        {formatMoneyFromCents(order.total_cents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/orders/$orderId"
                          params={{ orderId: String(order.id) }}
                          className="text-sm font-semibold text-(--sea-ink) no-underline hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-(--sea-ink-soft)"
                      >
                        No orders found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="m-0 text-sm text-(--sea-ink-soft)">
              Page {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-md border border-(--line) px-3 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded-md border border-(--line) px-3 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
