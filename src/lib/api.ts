import { getAuthToken, type AuthUser } from "#/lib/auth-session"

const DEFAULT_API = "http://localhost:8180"

export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (typeof url === "string" && url.length > 0) {
    return url.replace(/\/$/, "")
  }
  return DEFAULT_API
}

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  token: string
  user: AuthUser
}

export async function loginRequest(body: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Login failed"
    throw new Error(err)
  }
  return data as LoginResponse
}

function authJsonHeaders(): HeadersInit {
  const t = getAuthToken()
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (t) h.Authorization = `Bearer ${t}`
  return h
}

function authMultipartHeaders(): HeadersInit {
  const t = getAuthToken()
  const h: Record<string, string> = {}
  if (t) h.Authorization = `Bearer ${t}`
  return h
}

async function readApiError(res: Response): Promise<string> {
  const data: unknown = await res.json().catch(() => ({}))
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error
  }
  return `Request failed (${res.status})`
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/me`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AuthUser>
}

export type ProductImage = {
  id: number
  product_id: number
  public_url: string
  bucket_name: string
  object_name: string
  file_name: string
  content_type?: string
  size_bytes: number
  sort_order: number
  created_at: string
}

export type ProductSpecification = {
  id: number
  product_id: number
  spec_key: string
  spec_value: string
  created_at: string
  updated_at: string
}

/** Matches serverside `models.Category`. */
export type Category = {
  id: number
  name: string
  slug: string
  description?: string
  sort_order: number
  is_active: boolean
  icon_svg?: string
  color_hex?: string
  parent_id?: number | null
  parent?: Category | null
  image_public_url?: string
  image_bucket_name?: string
  image_object_name?: string
  image_file_name?: string
  image_content_type?: string
  image_size_bytes?: number
  created_at: string
  updated_at: string
}

export type PaginatedCategoriesResponse = {
  items: Category[]
  pagination: {
    page: number
    per_page: number
    total_items: number
    total_pages: number
  }
}

export async function fetchCategories(params?: {
  page?: number
  perPage?: number
}): Promise<PaginatedCategoriesResponse> {
  const page = params?.page ?? 1
  const perPage = params?.perPage ?? 100
  const searchParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/categories?${searchParams}`,
    { headers: authJsonHeaders() },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<PaginatedCategoriesResponse>
}

export async function fetchCategory(id: number): Promise<Category> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/categories/${id}`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Category>
}

export async function createCategory(body: {
  name: string
  slug?: string
  description?: string
  sort_order?: number
  is_active?: boolean
  icon_svg?: string
  color_hex?: string
  parent_id?: number | null
}): Promise<Category> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/categories`, {
    method: "POST",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Category>
}

export async function updateCategory(
  id: number,
  body: {
    name: string
    slug: string
    description?: string
    sort_order: number
    is_active: boolean
    icon_svg: string
    color_hex?: string
    parent_id: number | null
  },
): Promise<Category> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/categories/${id}`, {
    method: "PUT",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Category>
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/categories/${id}`, {
    method: "DELETE",
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
}

export async function uploadCategoryImage(
  categoryId: number,
  file: File,
): Promise<Category> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/categories/${categoryId}/images`,
    {
      method: "POST",
      headers: authMultipartHeaders(),
      body: fd,
    },
  )
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Upload failed (${res.status})`
    throw new Error(err)
  }
  return data as Category
}

/** Matches serverside `models.PricingTier`. */
export type PricingTier = {
  id: number
  product_id: number
  label: string
  min_quantity: number
  price_cents: number
  is_highlighted: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type Product = {
  id: number
  name: string
  description: string
  price_cents: number
  best_seller: boolean
  category_id?: number | null
  category?: Category | null
  created_at: string
  updated_at: string
  images?: ProductImage[]
  specifications?: ProductSpecification[]
  pricing_tiers?: PricingTier[]
}

export type PaginatedProductsResponse = {
  items: Product[]
  pagination: {
    page: number
    per_page: number
    total_items: number
    total_pages: number
  }
}

export async function fetchProducts(params?: {
  page?: number
  perPage?: number
}): Promise<PaginatedProductsResponse> {
  const page = params?.page ?? 1
  const perPage = params?.perPage ?? 12
  const searchParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  const res = await fetch(`${getApiBaseUrl()}/api/v1/products?${searchParams}`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<PaginatedProductsResponse>
}

export async function fetchProduct(id: number): Promise<Product> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/products/${id}`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Product>
}

export async function createProduct(body: {
  name: string
  description: string
  price_cents: number
  best_seller?: boolean
  category_id?: number | null
  specifications?: Array<{ key: string; value: string }>
}): Promise<Product> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/products`, {
    method: "POST",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Product>
}

export async function updateProduct(
  id: number,
  body: {
    name: string
    description: string
    price_cents: number
    best_seller: boolean
    category_id: number | null
    specifications?: Array<{ id?: number; key: string; value: string }>
  },
): Promise<Product> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/products/${id}`, {
    method: "PUT",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Product>
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/products/${id}`, {
    method: "DELETE",
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
}

export async function uploadProductImage(
  productId: number,
  file: File,
): Promise<ProductImage> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/products/${productId}/images`,
    {
      method: "POST",
      headers: authMultipartHeaders(),
      body: fd,
    },
  )
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Upload failed (${res.status})`
    throw new Error(err)
  }
  return data as ProductImage
}

export async function fetchProductSpecifications(
  productId: number,
): Promise<ProductSpecification[]> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/products/${productId}/specifications`,
    {
      headers: authJsonHeaders(),
    },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<ProductSpecification[]>
}

export async function createProductSpecification(
  productId: number,
  body: { key: string; value: string },
): Promise<ProductSpecification> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/products/${productId}/specifications`,
    {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<ProductSpecification>
}

export async function updateProductSpecification(
  productId: number,
  specId: number,
  body: { key: string; value: string },
): Promise<ProductSpecification> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/products/${productId}/specifications/${specId}`,
    {
      method: "PUT",
      headers: authJsonHeaders(),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<ProductSpecification>
}

export async function deleteProductSpecification(
  productId: number,
  specId: number,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/products/${productId}/specifications/${specId}`,
    {
      method: "DELETE",
      headers: authJsonHeaders(),
    },
  )
  if (!res.ok) throw new Error(await readApiError(res))
}

export type OrderItem = {
  id: number
  order_id: number
  product_id?: number | null
  pricing_tier_id?: number | null
  product_name: string
  product_image_url?: string
  category_name?: string
  tier_label?: string
  quantity: number
  unit_label?: string
  unit_weight_kg: number
  unit_price_cents: number
  line_subtotal_cents: number
  created_at: string
  updated_at: string
}

export type Order = {
  id: number
  order_number: string
  user_id: number
  user?: AuthUser | null
  customer_name: string
  company_name: string
  customer_email: string
  customer_phone: string
  account_type: string
  user_type: string
  rc_number?: string | null
  nif?: string | null
  wilaya: string
  city: string
  address: string
  contact_person: string
  instructions?: string
  status: string
  subtotal_cents: number
  tax_cents: number
  shipping_cents: number
  total_cents: number
  admin_note?: string
  items?: OrderItem[]
  created_at: string
  updated_at: string
}

export type PaginatedOrdersResponse = {
  items: Order[]
  pagination: {
    page: number
    per_page: number
    total_items: number
    total_pages: number
  }
}

export async function fetchOrders(params?: {
  page?: number
  perPage?: number
  status?: string
  q?: string
}): Promise<PaginatedOrdersResponse> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    per_page: String(params?.perPage ?? 12),
  })
  if (params?.status) searchParams.set('status', params.status)
  if (params?.q) searchParams.set('q', params.q)
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/orders?${searchParams}`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<PaginatedOrdersResponse>
}

export async function fetchOrder(id: number): Promise<Order> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/orders/${id}`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Order>
}

export async function updateOrderStatus(
  id: number,
  status: string,
): Promise<Order> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: authJsonHeaders(),
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Order>
}

export {
  AUTH_TOKEN_KEY,
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  saveAuthSession,
  type AuthUser,
} from "#/lib/auth-session"

