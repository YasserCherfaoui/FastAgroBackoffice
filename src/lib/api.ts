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

export type Brand = {
  id: number
  name: string
  slug: string
  brand_image?: string
  parent_id?: number | null
  parent?: Brand | null
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

export type PaginatedBrandsResponse = {
  items: Brand[]
  pagination: {
    page: number
    per_page: number
    total_items: number
    total_pages: number
  }
}

/** Matches serverside `models.Carousel`. */
export type Carousel = {
  id: number
  title?: string
  subtitle?: string
  cta_text?: string
  cta_url?: string
  sort_order: number
  is_active: boolean
  image_public_url?: string
  image_bucket_name?: string
  image_object_name?: string
  image_file_name?: string
  image_content_type?: string
  image_size_bytes?: number
  created_at: string
  updated_at: string
}

export type PaginatedCarouselsResponse = {
  items: Carousel[]
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
  q?: string
}): Promise<PaginatedCategoriesResponse> {
  const page = params?.page ?? 1
  const perPage = params?.perPage ?? 100
  const searchParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (params?.q?.trim()) searchParams.set("q", params.q.trim())
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

export async function fetchBrands(params?: {
  page?: number
  perPage?: number
  q?: string
}): Promise<PaginatedBrandsResponse> {
  const page = params?.page ?? 1
  const perPage = params?.perPage ?? 100
  const searchParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (params?.q?.trim()) searchParams.set("q", params.q.trim())
  const res = await fetch(`${getApiBaseUrl()}/api/v1/brands?${searchParams}`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<PaginatedBrandsResponse>
}

export async function fetchBrand(id: number): Promise<Brand> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/brands/${id}`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Brand>
}

export async function createBrand(body: {
  name: string
  slug?: string
  parent_id?: number | null
}): Promise<Brand> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/brands`, {
    method: "POST",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Brand>
}

export async function updateBrand(
  id: number,
  body: {
    name: string
    slug?: string
    parent_id: number | null
  },
): Promise<Brand> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/brands/${id}`, {
    method: "PUT",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Brand>
}

export async function deleteBrand(id: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/brands/${id}`, {
    method: "DELETE",
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
}

export async function uploadBrandImage(
  brandId: number,
  file: File,
): Promise<Brand> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch(`${getApiBaseUrl()}/api/v1/brands/${brandId}/images`, {
    method: "POST",
    headers: authMultipartHeaders(),
    body: fd,
  })
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
  return data as Brand
}

export async function fetchCarousels(params?: {
  page?: number
  perPage?: number
  q?: string
}): Promise<PaginatedCarouselsResponse> {
  const page = params?.page ?? 1
  const perPage = params?.perPage ?? 12
  const searchParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (params?.q?.trim()) searchParams.set("q", params.q.trim())
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/carousels?${searchParams}`,
    { headers: authJsonHeaders() },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<PaginatedCarouselsResponse>
}

export async function fetchCarousel(id: number): Promise<Carousel> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/carousels/${id}`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Carousel>
}

export async function createCarousel(body: {
  title?: string
  subtitle?: string
  cta_text?: string
  cta_url?: string
  sort_order?: number
  is_active?: boolean
}): Promise<Carousel> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/carousels`, {
    method: "POST",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Carousel>
}

export async function updateCarousel(
  id: number,
  body: {
    title?: string
    subtitle?: string
    cta_text?: string
    cta_url?: string
    sort_order: number
    is_active: boolean
  },
): Promise<Carousel> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/carousels/${id}`, {
    method: "PUT",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Carousel>
}

export async function deleteCarousel(id: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/carousels/${id}`, {
    method: "DELETE",
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
}

export async function uploadCarouselImage(
  carouselId: number,
  file: File,
): Promise<Carousel> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/carousels/${carouselId}/images`,
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
  return data as Carousel
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
  tax_rate_bps?: number
  weight_kg?: number
  best_seller: boolean
  category_id?: number | null
  category?: Category | null
  brand_id?: number | null
  brand?: Brand | null
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
  brandId?: number | null
  q?: string
}): Promise<PaginatedProductsResponse> {
  const page = params?.page ?? 1
  const perPage = params?.perPage ?? 12
  const searchParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (params?.brandId != null) {
    searchParams.set("brand_id", String(params.brandId))
  }
  if (params?.q?.trim()) searchParams.set("q", params.q.trim())
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
  tax_rate_bps?: number
  weight_kg: number
  best_seller?: boolean
  category_id?: number | null
  brand_id?: number | null
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
    tax_rate_bps: number
    weight_kg: number
    best_seller: boolean
    category_id: number | null
    brand_id: number | null
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
  state_id?: number | null
  state_name?: string
  country_name?: string
  wilaya?: string
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

/** Admin logistics — matches serverside `AdminCountryRow`. */
export type AdminCountryRow = {
  id: number
  code: string
  name: string
  is_active: boolean
  sort_order: number
}

/** Admin logistics — matches serverside `AdminStateRow`. */
export type AdminStateRow = {
  id: number
  country_id: number
  country_name?: string
  code: string
  name: string
  is_active: boolean
  sort_order: number
  shipping_cents?: number | null
}

export type GeoListPagination = {
  page: number
  per_page: number
  total_items: number
  total_pages: number
}

export type AdminCountriesListResponse = {
  items: AdminCountryRow[]
  pagination: GeoListPagination
}

export type AdminStatesListResponse = {
  items: AdminStateRow[]
  pagination: GeoListPagination
}

export async function fetchAdminGeoCountriesPaged(params: {
  page?: number
  perPage?: number
  q?: string
}): Promise<AdminCountriesListResponse> {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
  })
  if (params.q?.trim()) searchParams.set('q', params.q.trim())
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/admin/geo/countries?${searchParams}`,
    { headers: authJsonHeaders() },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AdminCountriesListResponse>
}

export async function createAdminGeoCountry(body: {
  code: string
  name: string
  sort_order?: number
  is_active?: boolean
}): Promise<AdminCountryRow> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/geo/countries`, {
    method: 'POST',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AdminCountryRow>
}

export async function updateAdminGeoCountry(
  id: number,
  body: {
    code: string
    name: string
    sort_order: number
    is_active: boolean
  },
): Promise<AdminCountryRow> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/geo/countries/${id}`, {
    method: 'PUT',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AdminCountryRow>
}

export async function deleteAdminGeoCountry(id: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/geo/countries/${id}`, {
    method: 'DELETE',
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
}

export async function patchAdminGeoCountry(
  id: number,
  body: { is_active: boolean },
): Promise<AdminCountryRow> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/geo/countries/${id}`, {
    method: 'PATCH',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AdminCountryRow>
}

export async function fetchAdminGeoStates(
  countryId: number,
): Promise<AdminStateRow[]> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/admin/geo/countries/${countryId}/states`,
    { headers: authJsonHeaders() },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  const data = (await res.json()) as { items: AdminStateRow[] }
  return data.items
}

export async function fetchAdminGeoStatesPaged(params: {
  page?: number
  perPage?: number
  q?: string
  countryId?: number
}): Promise<AdminStatesListResponse> {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
  })
  if (params.q?.trim()) searchParams.set('q', params.q.trim())
  if (params.countryId != null) {
    searchParams.set('country_id', String(params.countryId))
  }
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/admin/geo/states?${searchParams}`,
    { headers: authJsonHeaders() },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AdminStatesListResponse>
}

export async function createAdminGeoState(body: {
  country_id: number
  code: string
  name: string
  sort_order?: number
  is_active?: boolean
  shipping_cents?: number | null
}): Promise<AdminStateRow> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/geo/states`, {
    method: 'POST',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AdminStateRow>
}

export async function updateAdminGeoState(
  id: number,
  body: {
    country_id?: number | null
    code: string
    name: string
    sort_order: number
    is_active: boolean
    shipping_cents?: number | null
  },
): Promise<AdminStateRow> {
  const payload: Record<string, unknown> = {
    code: body.code,
    name: body.name,
    sort_order: body.sort_order,
    is_active: body.is_active,
  }
  if (body.country_id != null) payload.country_id = body.country_id
  if (body.shipping_cents !== undefined) {
    payload.shipping_cents =
      body.shipping_cents === null ? null : body.shipping_cents
  }
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/geo/states/${id}`, {
    method: 'PUT',
    headers: authJsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AdminStateRow>
}

export async function deleteAdminGeoState(id: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/geo/states/${id}`, {
    method: 'DELETE',
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
}

export async function patchAdminGeoState(
  id: number,
  body: { is_active: boolean },
): Promise<AdminStateRow> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/geo/states/${id}`, {
    method: 'PATCH',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AdminStateRow>
}

/** Matches serverside `models.OrderNotificationRecipient`. */
export type OrderNotificationRecipient = {
  id: number
  email: string
  created_at: string
  updated_at: string
}

export type OrderNotificationRecipientsResponse = {
  items: OrderNotificationRecipient[]
}

export async function fetchOrderNotificationRecipients(): Promise<OrderNotificationRecipientsResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/admin/order-notification-recipients`,
    { headers: authJsonHeaders() },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<OrderNotificationRecipientsResponse>
}

export async function createOrderNotificationRecipient(body: {
  email: string
}): Promise<OrderNotificationRecipient> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/admin/order-notification-recipients`,
    {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<OrderNotificationRecipient>
}

export async function deleteOrderNotificationRecipient(
  id: number,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/admin/order-notification-recipients/${id}`,
    {
      method: "DELETE",
      headers: authJsonHeaders(),
    },
  )
  if (!res.ok) throw new Error(await readApiError(res))
}

export async function putAdminGeoDeliveryRate(
  stateId: number,
  shippingCents: number,
): Promise<AdminStateRow> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/admin/geo/states/${stateId}/delivery-rate`,
    {
      method: 'PUT',
      headers: authJsonHeaders(),
      body: JSON.stringify({ shipping_cents: shippingCents }),
    },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<AdminStateRow>
}

export {
  AUTH_TOKEN_KEY,
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  saveAuthSession,
  type AuthUser,
} from "#/lib/auth-session"

