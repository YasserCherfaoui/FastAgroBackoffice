import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { useToast } from "#/components/ui/toast"
import { fetchOrder, updateOrderStatus } from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

export const Route = createFileRoute("/orders/$orderId")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: OrderDetailPage,
})

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const id = Number.parseInt(orderId, 10)
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
    enabled: Number.isFinite(id),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateOrderStatus(id, status),
    onSuccess: () => {
      showToast("success", "Order status updated.")
      void queryClient.invalidateQueries({ queryKey: ["orders"] })
      void queryClient.invalidateQueries({ queryKey: ["order", id] })
    },
    onError: (err) => {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to update order status.",
      )
    },
  })

  if (!Number.isFinite(id)) {
    return <main className="page-wrap py-8">Invalid order id.</main>
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-4">
        <Link
          to="/orders"
          className="text-sm font-semibold text-(--sea-ink) no-underline hover:underline"
        >
          ← Back to orders
        </Link>
      </div>

      {orderQuery.isLoading ? (
        <p className="text-sm text-(--sea-ink-soft)">Loading order...</p>
      ) : null}

      {orderQuery.isError ? (
        <p className="text-sm text-red-700">
          {orderQuery.error instanceof Error
            ? orderQuery.error.message
            : "Failed to load order."}
        </p>
      ) : null}

      {orderQuery.data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>{orderQuery.data.order_number}</CardTitle>
              <CardDescription>
                {orderQuery.data.customer_name} · {orderQuery.data.company_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="m-0 text-xs font-semibold uppercase text-(--sea-ink-soft)">
                    Contact
                  </p>
                  <p className="m-0 mt-2 text-sm">{orderQuery.data.contact_person}</p>
                  <p className="m-0 mt-1 text-sm">{orderQuery.data.customer_email}</p>
                  <p className="m-0 mt-1 text-sm">{orderQuery.data.customer_phone}</p>
                </div>
                <div>
                  <p className="m-0 text-xs font-semibold uppercase text-(--sea-ink-soft)">
                    Shipping
                  </p>
                  <p className="m-0 mt-2 text-sm">{orderQuery.data.address}</p>
                  <p className="m-0 mt-1 text-sm">
                    {[
                      orderQuery.data.city,
                      orderQuery.data.state_name || orderQuery.data.wilaya,
                      orderQuery.data.country_name,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {orderQuery.data.instructions ? (
                    <p className="m-0 mt-2 text-sm text-(--sea-ink-soft)">
                      {orderQuery.data.instructions}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border border-(--line)">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-(--surface) text-(--sea-ink-soft)">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Tier</th>
                      <th className="px-4 py-3 font-medium">Quantity</th>
                      <th className="px-4 py-3 font-medium">Unit price</th>
                      <th className="px-4 py-3 font-medium">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orderQuery.data.items ?? []).map((item) => (
                      <tr key={item.id} className="border-t border-(--line)">
                        <td className="px-4 py-3">
                          <p className="m-0 font-semibold">{item.product_name}</p>
                          <p className="m-0 mt-1 text-xs text-(--sea-ink-soft)">
                            {item.category_name || "Uncategorized"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-(--sea-ink-soft)">
                          {item.tier_label || "Base"}
                        </td>
                        <td className="px-4 py-3 text-(--sea-ink-soft)">
                          {item.quantity} {item.unit_label || "units"}
                        </td>
                        <td className="px-4 py-3 text-(--sea-ink-soft)">
                          {formatMoney(item.unit_price_cents)}
                        </td>
                        <td className="px-4 py-3 text-(--sea-ink-soft)">
                          {formatMoney(item.line_subtotal_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Update the order fulfillment stage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="m-0 text-xs font-semibold uppercase text-(--sea-ink-soft)">
                  Current
                </p>
                <p className="m-0 mt-2 text-lg font-semibold capitalize">
                  {orderQuery.data.status}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-(--sea-ink-soft)">
                  Set new status
                </label>
                <select
                  defaultValue={orderQuery.data.status}
                  onChange={(event) => {
                    if (event.target.value === orderQuery.data?.status) return
                    statusMutation.mutate(event.target.value)
                  }}
                  className="h-10 w-full rounded-md border border-(--line) bg-(--surface) px-3 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-2 border-t border-(--line) pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-(--sea-ink-soft)">Subtotal</span>
                  <span>{formatMoney(orderQuery.data.subtotal_cents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-(--sea-ink-soft)">Tax</span>
                  <span>{formatMoney(orderQuery.data.tax_cents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-(--sea-ink-soft)">Shipping</span>
                  <span>{formatMoney(orderQuery.data.shipping_cents)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(orderQuery.data.total_cents)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  )
}
