const DEFAULT_API = "http://localhost:8080"

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
  user: { id: number; email: string }
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

export const AUTH_TOKEN_KEY = "fastagro_auth_token"

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
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

export type Product = {
  id: number
  name: string
  description: string
  price_cents: number
  created_at: string
  updated_at: string
  images?: ProductImage[]
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/products`, {
    headers: authJsonHeaders(),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<Product[]>
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
  body: { name: string; description: string; price_cents: number },
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

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}
