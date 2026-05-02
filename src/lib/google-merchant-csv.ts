import type { Product } from "#/lib/api"

const HEADER = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
  "availability",
  "price",
  "brand",
  "condition",
  "product_type",
] as const

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function normalizeDescription(text: string): string {
  return text.replace(/\r\n|\r|\n/g, " ").replace(/\s+/g, " ").trim()
}

function sortedImageUrls(product: Product): string[] {
  const images = product.images ?? []
  const copy = [...images].sort((a, b) => a.sort_order - b.sort_order)
  return copy.map((img) => img.public_url).filter((u) => u.length > 0)
}

export function getStorefrontProductUrl(
  storefrontBase: string,
  productId: number,
): string {
  const base = storefrontBase.replace(/\/$/, "")
  return `${base}/products/${productId}`
}

function priceForMerchant(priceCents: number): string {
  const amount = (priceCents / 100).toFixed(2)
  return `${amount} DZD`
}

function productToRow(
  product: Product,
  storefrontBase: string,
): Record<(typeof HEADER)[number], string> {
  const urls = sortedImageUrls(product)
  const [imageLink, ...additional] = urls
  return {
    id: String(product.id),
    title: product.name,
    description: normalizeDescription(product.description ?? ""),
    link: getStorefrontProductUrl(storefrontBase, product.id),
    image_link: imageLink ?? "",
    additional_image_link: additional.join(","),
    availability: "in_stock",
    price: priceForMerchant(product.price_cents),
    brand: product.brand?.name ?? "",
    condition: "new",
    product_type: product.category?.name ?? "",
  }
}

export function productsToGoogleMerchantCsv(
  products: Product[],
  storefrontBase: string,
): string {
  const lines: string[] = [HEADER.join(",")]
  for (const p of products) {
    const row = productToRow(p, storefrontBase)
    lines.push(HEADER.map((key) => escapeCsvField(row[key])).join(","))
  }
  return lines.join("\r\n")
}
