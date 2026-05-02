/** Centimes on the wire (100 = 1 DA). */
export function formatMoneyFromCents(cents: number): string {
  return new Intl.NumberFormat("en-DZ", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}
