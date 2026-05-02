import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"

import { useDebouncedValue } from "#/lib/use-debounced-value"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import { Switch } from "#/components/ui/switch"
import {
  createAdminGeoCountry,
  createAdminGeoState,
  deleteAdminGeoCountry,
  deleteAdminGeoState,
  fetchAdminGeoCountriesPaged,
  fetchAdminGeoStatesPaged,
  patchAdminGeoCountry,
  patchAdminGeoState,
  putAdminGeoDeliveryRate,
  updateAdminGeoCountry,
  updateAdminGeoState,
  type AdminCountryRow,
  type AdminStateRow,
} from "#/lib/api"
import { redirectIfUnauthenticated } from "#/lib/require-auth"

export const Route = createFileRoute("/logistics/")({
  ssr: false,
  beforeLoad: () => {
    redirectIfUnauthenticated()
  },
  component: LogisticsPage,
})

function centsToDisplayDa(cents: number | null | undefined): string {
  if (cents == null || cents === undefined) return ""
  return String(Math.round(cents / 100))
}

function parseDaToCents(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", ".").trim())
  if (Number.isNaN(n) || n < 0) return -1
  return Math.round(n * 100)
}

const PAGE_SIZE = 10

function LogisticsPage() {
  const qc = useQueryClient()

  const [countryPage, setCountryPage] = useState(1)
  const [countryQInput, setCountryQInput] = useState("")
  const countryQ = useDebouncedValue(countryQInput, 320)
  useEffect(() => {
    setCountryPage(1)
  }, [countryQ])

  const countriesQ = useQuery({
    queryKey: ["admin", "geo", "countries", "paged", countryPage, countryQ],
    queryFn: () =>
      fetchAdminGeoCountriesPaged({
        page: countryPage,
        perPage: PAGE_SIZE,
        q: countryQ,
      }),
  })

  const countryOptionsQ = useQuery({
    queryKey: ["admin", "geo", "countries", "options"],
    queryFn: () =>
      fetchAdminGeoCountriesPaged({ page: 1, perPage: 100, q: "" }),
  })
  const countryOptions = countryOptionsQ.data?.items ?? []

  const [statePage, setStatePage] = useState(1)
  const [stateQInput, setStateQInput] = useState("")
  const stateQ = useDebouncedValue(stateQInput, 320)
  const [stateCountryFilter, setStateCountryFilter] = useState<string>("all")
  useEffect(() => {
    setStatePage(1)
  }, [stateQ, stateCountryFilter])

  const statesQ = useQuery({
    queryKey: [
      "admin",
      "geo",
      "states",
      "paged",
      statePage,
      stateQ,
      stateCountryFilter,
    ],
    queryFn: () =>
      fetchAdminGeoStatesPaged({
        page: statePage,
        perPage: PAGE_SIZE,
        q: stateQ,
        countryId:
          stateCountryFilter === "all"
            ? undefined
            : Number.parseInt(stateCountryFilter, 10),
      }),
  })

  const createCountry = useMutation({
    mutationFn: createAdminGeoCountry,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "countries"] })
    },
  })

  const updateCountry = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number
      body: Parameters<typeof updateAdminGeoCountry>[1]
    }) => updateAdminGeoCountry(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "countries"] })
    },
  })

  const [editingCountry, setEditingCountry] = useState<AdminCountryRow | null>(
    null,
  )
  const [editingState, setEditingState] = useState<AdminStateRow | null>(null)

  const removeCountry = useMutation({
    mutationFn: deleteAdminGeoCountry,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "countries"] })
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "states"] })
    },
  })

  const patchCountry = useMutation({
    mutationFn: ({
      id,
      is_active,
    }: {
      id: number
      is_active: boolean
    }) => patchAdminGeoCountry(id, { is_active }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "countries"] })
    },
  })

  const createState = useMutation({
    mutationFn: createAdminGeoState,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "states"] })
    },
  })

  const updateState = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number
      body: Parameters<typeof updateAdminGeoState>[1]
    }) => updateAdminGeoState(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "states"] })
    },
  })

  const removeState = useMutation({
    mutationFn: deleteAdminGeoState,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "states"] })
    },
  })

  const patchState = useMutation({
    mutationFn: ({
      id,
      is_active,
    }: {
      id: number
      is_active: boolean
    }) => patchAdminGeoState(id, { is_active }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "states"] })
    },
  })

  const putRate = useMutation({
    mutationFn: ({
      stateId,
      shippingCents,
    }: {
      stateId: number
      shippingCents: number
    }) => putAdminGeoDeliveryRate(stateId, shippingCents),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "geo", "states"] })
    },
  })

  const countryColumns = useMemo<ColumnDef<AdminCountryRow>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "sort_order", header: "Order" },
      {
        id: "active",
        header: "Active",
        cell: ({ row }) => (
          <Switch
            checked={row.original.is_active}
            disabled={patchCountry.isPending}
            onCheckedChange={(checked) =>
              patchCountry.mutate({ id: row.original.id, is_active: checked })
            }
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingCountry(row.original)
                setEditingState(null)
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={removeCountry.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    `Delete country “${row.original.name}”? This removes its states and rates.`,
                  )
                ) {
                  return
                }
                removeCountry.mutate(row.original.id)
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [patchCountry, removeCountry],
  )

  const countriesData = countriesQ.data?.items ?? []
  const countriesTable = useReactTable({
    data: countriesData,
    columns: countryColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const cp = countriesQ.data?.pagination

  const stateColumns = useMemo<ColumnDef<AdminStateRow>[]>(
    () => [
      {
        accessorKey: "country_name",
        header: "Country",
        cell: ({ row }) => (
          <span className="text-(--sea-ink-soft)">
            {row.original.country_name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
      },
      { accessorKey: "name", header: "State / wilaya" },
      { accessorKey: "sort_order", header: "Order" },
      {
        id: "active",
        header: "Active",
        cell: ({ row }) => (
          <Switch
            checked={row.original.is_active}
            disabled={patchState.isPending}
            onCheckedChange={(checked) =>
              patchState.mutate({ id: row.original.id, is_active: checked })
            }
          />
        ),
      },
      {
        id: "rate",
        header: "Delivery (DA)",
        cell: ({ row }) => (
          <StateRateCell
            row={row.original}
            disabled={patchState.isPending || putRate.isPending}
            onSave={(shippingCents) =>
              putRate.mutate({ stateId: row.original.id, shippingCents })
            }
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingState(row.original)
                setEditingCountry(null)
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={removeState.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    `Delete state “${row.original.name}” (${row.original.code})?`,
                  )
                ) {
                  return
                }
                removeState.mutate(row.original.id)
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [patchState, putRate, removeState],
  )

  const statesData = statesQ.data?.items ?? []
  const statesTable = useReactTable({
    data: statesData,
    columns: stateColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const sp = statesQ.data?.pagination

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <p className="island-kicker mb-1">Backoffice</p>
          <h1 className="text-(--sea-ink) m-0 text-3xl font-semibold">
            Logistics & delivery zones
          </h1>
          <p className="text-(--sea-ink-soft) mt-1 text-sm">
            Manage countries and states (wilayas), enable delivery, and set
            shipping prices per zone. Prices are stored as centimes (1 DA = 100
            centimes).
          </p>
        </div>

        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-lg">Countries</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Create countries and control whether they appear on the storefront.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {editingCountry ? (
              <CountryForm
                key={editingCountry.id}
                title="Edit country"
                submitLabel="Save"
                disabled={updateCountry.isPending}
                initial={editingCountry}
                showCancel
                onCancel={() => setEditingCountry(null)}
                onSubmit={(values) =>
                  updateCountry.mutate(
                    { id: editingCountry.id, body: values },
                    { onSuccess: () => setEditingCountry(null) },
                  )
                }
              />
            ) : (
              <CountryForm
                title="Add country"
                submitLabel="Create"
                disabled={createCountry.isPending}
                onSubmit={(values) => createCountry.mutate(values)}
              />
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Label htmlFor="country-search" className="sr-only">
                Search countries
              </Label>
              <Input
                id="country-search"
                placeholder="Search by name or code…"
                value={countryQInput}
                onChange={(e) => setCountryQInput(e.target.value)}
                className="max-w-md"
              />
            </div>

            {countriesQ.isLoading ? (
              <p className="text-(--sea-ink-soft) text-sm">Loading…</p>
            ) : countriesQ.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {countriesQ.error instanceof Error
                  ? countriesQ.error.message
                  : "Failed to load"}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border border-(--line)">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-(--surface) border-b border-(--line)">
                      {countriesTable.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                          {hg.headers.map((h) => (
                            <th
                              key={h.id}
                              className="px-3 py-2 font-semibold"
                            >
                              {h.isPlaceholder
                                ? null
                                : flexRender(
                                    h.column.columnDef.header,
                                    h.getContext(),
                                  )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {countriesTable.getRowModel().rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={countryColumns.length}
                            className="text-(--sea-ink-soft) px-3 py-6 text-center"
                          >
                            No countries match your search.
                          </td>
                        </tr>
                      ) : (
                        countriesTable.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-(--line) last:border-0"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="px-3 py-2 align-middle">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {cp ? (
                  <PaginationBar
                    page={cp.page}
                    totalPages={cp.total_pages}
                    totalItems={cp.total_items}
                    onPrev={() => setCountryPage((p) => Math.max(1, p - 1))}
                    onNext={() =>
                      setCountryPage((p) =>
                        cp.total_pages > 0
                          ? Math.min(cp.total_pages, p + 1)
                          : p + 1,
                      )
                    }
                    disabledPrev={countryPage <= 1}
                    disabledNext={
                      cp.total_pages === 0 || countryPage >= cp.total_pages
                    }
                  />
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-lg">States / wilayas</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Create states, attach them to a country, set delivery price, and
              toggle availability.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {editingState ? (
              <StateForm
                key={editingState.id}
                countries={countryOptions}
                title="Edit state"
                submitLabel="Save"
                disabled={updateState.isPending}
                initial={editingState}
                showCancel
                onCancel={() => setEditingState(null)}
                onSubmit={(values) =>
                  updateState.mutate(
                    {
                      id: editingState.id,
                      body: {
                        code: values.code,
                        name: values.name,
                        sort_order: values.sort_order,
                        is_active: values.is_active,
                        country_id: values.country_id,
                        shipping_cents: values.shipping_cents,
                      },
                    },
                    { onSuccess: () => setEditingState(null) },
                  )
                }
              />
            ) : (
              <StateForm
                countries={countryOptions}
                title="Add state"
                submitLabel="Create"
                disabled={createState.isPending}
                onSubmit={(values) => createState.mutate(values)}
              />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex flex-col gap-2">
                <Label htmlFor="state-country-filter">Country</Label>
                <Select
                  value={stateCountryFilter}
                  onValueChange={(v) => setStateCountryFilter(v)}
                >
                  <SelectTrigger id="state-country-filter" className="w-[220px]">
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {countryOptions.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-1 flex-col gap-2 sm:min-w-[240px]">
                <Label htmlFor="state-search" className="sr-only">
                  Search states
                </Label>
                <Input
                  id="state-search"
                  placeholder="Search by name or code…"
                  value={stateQInput}
                  onChange={(e) => setStateQInput(e.target.value)}
                />
              </div>
            </div>

            {statesQ.isLoading ? (
              <p className="text-(--sea-ink-soft) text-sm">Loading…</p>
            ) : statesQ.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {statesQ.error instanceof Error
                  ? statesQ.error.message
                  : "Failed to load"}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border border-(--line)">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-(--surface) border-b border-(--line)">
                      {statesTable.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                          {hg.headers.map((h) => (
                            <th
                              key={h.id}
                              className="px-3 py-2 font-semibold"
                            >
                              {h.isPlaceholder
                                ? null
                                : flexRender(
                                    h.column.columnDef.header,
                                    h.getContext(),
                                  )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {statesTable.getRowModel().rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={stateColumns.length}
                            className="text-(--sea-ink-soft) px-3 py-6 text-center"
                          >
                            No states match your filters.
                          </td>
                        </tr>
                      ) : (
                        statesTable.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-(--line) last:border-0"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="px-3 py-2 align-middle">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {sp ? (
                  <PaginationBar
                    page={sp.page}
                    totalPages={sp.total_pages}
                    totalItems={sp.total_items}
                    onPrev={() => setStatePage((p) => Math.max(1, p - 1))}
                    onNext={() =>
                      setStatePage((p) =>
                        sp.total_pages > 0
                          ? Math.min(sp.total_pages, p + 1)
                          : p + 1,
                      )
                    }
                    disabledPrev={statePage <= 1}
                    disabledNext={
                      sp.total_pages === 0 || statePage >= sp.total_pages
                    }
                  />
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function PaginationBar({
  page,
  totalPages,
  totalItems,
  onPrev,
  onNext,
  disabledPrev,
  disabledNext,
}: {
  page: number
  totalPages: number
  totalItems: number
  onPrev: () => void
  onNext: () => void
  disabledPrev: boolean
  disabledNext: boolean
}) {
  return (
    <div className="text-(--sea-ink-soft) flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>
        Page {page}
        {totalPages > 0 ? ` of ${totalPages}` : ""}
        {totalItems >= 0 ? ` · ${totalItems} record(s)` : ""}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabledPrev}
          onClick={onPrev}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabledNext}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function CountryForm({
  title,
  submitLabel,
  disabled,
  onSubmit,
  initial,
  showCancel,
  onCancel,
}: {
  title: string
  submitLabel: string
  disabled: boolean
  onSubmit: (values: {
    code: string
    name: string
    sort_order: number
    is_active: boolean
  }) => void
  initial?: AdminCountryRow | null
  showCancel?: boolean
  onCancel?: () => void
}) {
  const [code, setCode] = useState(initial?.code ?? "")
  const [name, setName] = useState(initial?.name ?? "")
  const [sortOrder, setSortOrder] = useState(
    () => String(initial?.sort_order ?? 0),
  )
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  useEffect(() => {
    if (!initial) return
    setCode(initial.code)
    setName(initial.name)
    setSortOrder(String(initial.sort_order))
    setIsActive(initial.is_active)
  }, [initial])

  return (
    <div className="rounded-lg border border-(--line) bg-(--surface) p-4">
      <p className="text-(--sea-ink) mb-3 text-sm font-medium">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="c-code">Code</Label>
          <Input
            id="c-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor="c-name">Name</Label>
          <Input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="c-order">Sort order</Label>
          <Input
            id="c-order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <div className="flex flex-1 items-center gap-2">
            <Switch
              id="c-active"
              checked={isActive}
              disabled={disabled}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="c-active" className="text-(--sea-ink-soft) text-xs">
              Active
            </Label>
          </div>
          {showCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => onCancel?.()}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => {
              const so = Number.parseInt(sortOrder, 10)
              onSubmit({
                code: code.trim(),
                name: name.trim(),
                sort_order: Number.isNaN(so) ? 0 : so,
                is_active: isActive,
              })
            }}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StateForm({
  countries,
  title,
  submitLabel,
  disabled,
  onSubmit,
  initial,
  showCancel,
  onCancel,
}: {
  countries: AdminCountryRow[]
  title: string
  submitLabel: string
  disabled: boolean
  onSubmit: (values: {
    country_id: number
    code: string
    name: string
    sort_order: number
    is_active: boolean
    shipping_cents?: number | null
  }) => void
  initial?: AdminStateRow | null
  showCancel?: boolean
  onCancel?: () => void
}) {
  const [countryId, setCountryId] = useState<string>(() =>
    initial
      ? String(initial.country_id)
      : countries[0]
        ? String(countries[0].id)
        : "",
  )
  const [code, setCode] = useState(initial?.code ?? "")
  const [name, setName] = useState(initial?.name ?? "")
  const [sortOrder, setSortOrder] = useState(
    () => String(initial?.sort_order ?? 0),
  )
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [da, setDa] = useState(() =>
    centsToDisplayDa(initial?.shipping_cents ?? undefined),
  )

  useEffect(() => {
    if (initial) {
      setCountryId(String(initial.country_id))
      setCode(initial.code)
      setName(initial.name)
      setSortOrder(String(initial.sort_order))
      setIsActive(initial.is_active)
      setDa(centsToDisplayDa(initial.shipping_cents ?? undefined))
      return
    }
    if (countries.length && !countryId) {
      setCountryId(String(countries[0].id))
    }
  }, [countries, countryId, initial])

  return (
    <div className="rounded-lg border border-(--line) bg-(--surface) p-4">
      <p className="text-(--sea-ink) mb-3 text-sm font-medium">{title}</p>
      <div className="grid gap-3 lg:grid-cols-6">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <Label>Country</Label>
          <Select
            value={countryId}
            onValueChange={setCountryId}
            disabled={disabled || countries.length === 0}
          >
            <SelectTrigger className="w-full min-w-[200px]">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="s-code">Code</Label>
          <Input
            id="s-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1 lg:col-span-2">
          <Label htmlFor="s-name">Name</Label>
          <Input
            id="s-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="s-order">Order</Label>
          <Input
            id="s-order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="s-da">Delivery (DA)</Label>
          <Input
            id="s-da"
            value={da}
            onChange={(e) => setDa(e.target.value)}
            disabled={disabled}
            placeholder="Optional"
          />
        </div>
        <div className="flex items-end gap-2 lg:col-span-6">
          <div className="flex items-center gap-2 pb-0.5">
            <Switch
              id="s-active"
              checked={isActive}
              disabled={disabled}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="s-active" className="text-(--sea-ink-soft) text-xs">
              Active
            </Label>
          </div>
          {showCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => onCancel?.()}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={disabled || !countryId}
            onClick={() => {
              const so = Number.parseInt(sortOrder, 10)
              const cents = da.trim() === "" ? undefined : parseDaToCents(da)
              if (cents !== undefined && cents < 0) return
              onSubmit({
                country_id: Number.parseInt(countryId, 10),
                code: code.trim(),
                name: name.trim(),
                sort_order: Number.isNaN(so) ? 0 : so,
                is_active: isActive,
                shipping_cents: cents,
              })
            }}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StateRateCell({
  row,
  disabled,
  onSave,
}: {
  row: AdminStateRow
  disabled: boolean
  onSave: (shippingCents: number) => void
}) {
  const [da, setDa] = useState(() =>
    centsToDisplayDa(row.shipping_cents ?? undefined),
  )
  useEffect(() => {
    setDa(centsToDisplayDa(row.shipping_cents ?? undefined))
  }, [row.shipping_cents])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="text"
        inputMode="decimal"
        className="max-w-[120px]"
        value={da}
        onChange={(e) => setDa(e.target.value)}
        disabled={disabled}
        aria-label={`Delivery price DA for ${row.name}`}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          const cents = parseDaToCents(da)
          if (cents < 0) return
          onSave(cents)
        }}
      >
        Save
      </Button>
    </div>
  )
}
