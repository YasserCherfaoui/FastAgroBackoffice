/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Public storefront origin for product links in exports (no trailing slash). */
  readonly VITE_STOREFRONT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
