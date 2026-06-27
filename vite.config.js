import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Modern browsers only — avoids legacy transpilation flagged by Lighthouse.
    target: 'es2020',
    // Hashed build output lives under /static so it can be cached immutably,
    // separate from the non-hashed public assets served from /assets.
    assetsDir: 'static',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split the rarely-changing React/router runtime into its own
          // long-cacheable chunk. NOTE: do NOT manualChunk @babylonjs/* — Rollup
          // already splits Babylon's shaders/texture-loaders into many on-demand
          // chunks, and forcing them into one chunk would eagerly load ~6 MB of
          // shaders upfront. (The large shader chunk is reduced separately via
          // deep Babylon imports.)
          if (id.includes('node_modules')) {
            if (
              id.includes('/react-router') ||
              id.includes('/react-dom/') ||
              id.includes('/react/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor'
            }
          }
        },
      },
    },
  },
})
