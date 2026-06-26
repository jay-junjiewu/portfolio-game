import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Modern browsers only — avoids legacy transpilation flagged by Lighthouse.
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
})
