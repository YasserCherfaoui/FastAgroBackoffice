import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

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
import { Switch } from "#/components/ui/switch"
import {
  fetchAdminGeoCountries,
  fetchAdminGeoStates,
  patchAdminGeoCountry,
  patchAdminGeoState,
  putAdminGeoDeliveryRate,
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

function LogisticsPage() {
  const qc = useQueryClient()
  const countriesQ = useQuery({
    queryKey: ["admin", "geo", "countries"],
    queryFn: fetchAdminGeoCountries,
  })
  const countries = countriesQ.data ?? []
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(
    null,
  )

  useEffect(() => {
    if (countries.length && selectedCountryId == null) {
      setSelectedCountryId(countries[0].id)
    }
  }, [countries, selectedCountryId])

  const statesQ = useQuery({
    queryKey: ["admin", "geo", "states", selectedCountryId],
    queryFn: () => fetchAdminGeoStates(selectedCountryId!),
    enabled: selectedCountryId != null,
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

  const patchState = useMutation({
    mutationFn: ({
      id,
      is_active,
    }: {
      id: number
      is_active: boolean
    }) => patchAdminGeoState(id, { is_active }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "geo", "states", selectedCountryId],
      })
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
      void qc.invalidateQueries({
        queryKey: ["admin", "geo", "states", selectedCountryId],
      })
    },
  })

  const selectedCountry = useMemo(
    () => countries.find((c) => c.id === selectedCountryId),
    [countries, selectedCountryId],
  )

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <p className="island-kicker mb-1">Backoffice</p>
          <h1 className="text-(--sea-ink) m-0 text-3xl font-semibold">
            Logistics & delivery zones
          </h1>
          <p className="text-(--sea-ink-soft) mt-1 text-sm">
            Enable countries and states, then set a delivery price (DA) per
            state. Prices are stored as centimes (1 DA = 100 centimes) on the
            server.
          </p>
        </div>

        <Card className="border-(--line) bg-(--surface-strong)">
          <CardHeader>
            <CardTitle className="text-lg">Countries</CardTitle>
            <CardDescription className="text-(--sea-ink-soft)">
              Only active countries appear on the storefront. States inherit
              availability from their country.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {countriesQ.isLoading ? (
              <p className="text-(--sea-ink-soft) text-sm">Loading…</p>
            ) : countriesQ.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {countriesQ.error instanceof Error
                  ? countriesQ.error.message
                  : "Failed to load"}
              </p>
            ) : (
              <ul className="space-y-3">
                {countries.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--line) px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCountryId(c.id)}
                      className={`text-left font-medium underline-offset-2 hover:underline ${
                        selectedCountryId === c.id
                          ? "text-(--lagoon-deep)"
                          : "text-(--sea-ink)"
                      }`}
                    >
                      {c.name}{" "}
                      <span className="text-(--sea-ink-soft) font-normal">
                        ({c.code})
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`country-active-${c.id}`}
                        className="text-(--sea-ink-soft) text-xs"
                      >
                        Active
                      </Label>
                      <Switch
                        id={`country-active-${c.id}`}
                        checked={c.is_active}
                        disabled={patchCountry.isPending}
                        onCheckedChange={(checked) => {
                          patchCountry.mutate({ id: c.id, is_active: checked })
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {selectedCountry ? (
          <Card className="border-(--line) bg-(--surface-strong)">
            <CardHeader>
              <CardTitle className="text-lg">
                States — {selectedCountry.name}
              </CardTitle>
              <CardDescription className="text-(--sea-ink-soft)">
                Toggle delivery per state and set the price customers pay for
                shipping to that zone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statesQ.isLoading ? (
                <p className="text-(--sea-ink-soft) text-sm">Loading…</p>
              ) : statesQ.isError ? (
                <p className="text-destructive text-sm" role="alert">
                  {statesQ.error instanceof Error
                    ? statesQ.error.message
                    : "Failed to load"}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-(--line)">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-(--surface) border-b border-(--line)">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Code</th>
                        <th className="px-3 py-2 font-semibold">State</th>
                        <th className="px-3 py-2 font-semibold">Active</th>
                        <th className="px-3 py-2 font-semibold">
                          Delivery (DA)
                        </th>
                        <th className="px-3 py-2 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {(statesQ.data ?? []).map((row) => (
                        <StateRateRow
                          key={row.id}
                          row={row}
                          disabled={patchState.isPending || putRate.isPending}
                          onToggleActive={(is_active) =>
                            patchState.mutate({ id: row.id, is_active })
                          }
                          onSaveRate={(shippingCents) =>
                            putRate.mutate({ stateId: row.id, shippingCents })
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  )
}

function StateRateRow({
  row,
  disabled,
  onToggleActive,
  onSaveRate,
}: {
  row: AdminStateRow
  disabled: boolean
  onToggleActive: (is_active: boolean) => void
  onSaveRate: (shippingCents: number) => void
}) {
  const [da, setDa] = useState(() =>
    centsToDisplayDa(row.shipping_cents ?? undefined),
  )
  useEffect(() => {
    setDa(centsToDisplayDa(row.shipping_cents ?? undefined))
  }, [row.shipping_cents])

  return (
    <tr className="border-b border-(--line) last:border-0">
      <td className="text-(--sea-ink-soft) px-3 py-2 font-mono text-xs">
        {row.code}
      </td>
      <td className="px-3 py-2">{row.name}</td>
      <td className="px-3 py-2">
        <Switch
          checked={row.is_active}
          disabled={disabled}
          onCheckedChange={onToggleActive}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="text"
          inputMode="decimal"
          className="max-w-[140px]"
          value={da}
          onChange={(e) => setDa(e.target.value)}
          disabled={disabled}
          aria-label={`Delivery price DA for ${row.name}`}
        />
      </td>
      <td className="px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            const cents = parseDaToCents(da)
            if (cents < 0) return
            onSaveRate(cents)
          }}
        >
          Save price
        </Button>
      </td>
    </tr>
  )
}
