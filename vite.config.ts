import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Put the client bundle at dist/ (not dist/client/) so Vercel’s default Vite output dir finds index.html.
  environments: {
    client: {
      build: {
        outDir: 'dist',
      },
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      // Emit a prerendered SPA shell so `dist/client/index.html` exists for static hosts (e.g. Vercel).
      spa: {
        enabled: true,
        prerender: {
          crawlLinks: true,
        },
      },
    }),
    viteReact(),
  ],
})

export default config
