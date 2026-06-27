import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only middleware so `npm run dev` also serves the Vercel /api serverless
// functions. Plain Vite doesn't run them (that's why /api/* returns 404 under
// `vite`), and `vercel dev` requires linking the project. This plugin loads
// each api/*.ts handler on demand and adapts Connect's req/res to the small
// @vercel/node surface the handlers use. It only runs in `vite serve`; in
// production the real Vercel functions handle these routes.
function devApiPlugin() {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || ''
        if (!rawUrl.startsWith('/api/')) return next()

        const pathname = rawUrl.split('?')[0]
        const name = pathname.replace(/^\/api\//, '').replace(/\/+$/, '')

        // ---- @vercel/node-compatible shim over Connect's req/res ----
        const u = new URL(rawUrl, 'http://localhost')
        req.query = Object.fromEntries(u.searchParams.entries())

        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          const raw = await new Promise((resolve) => {
            let data = ''
            req.on('data', (chunk) => (data += chunk))
            req.on('end', () => resolve(data))
            req.on('error', () => resolve(''))
          })
          try {
            req.body = raw ? JSON.parse(raw) : {}
          } catch {
            req.body = raw
          }
        }

        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (obj) => {
          if (!res.getHeader('content-type')) {
            res.setHeader('content-type', 'application/json')
          }
          res.end(JSON.stringify(obj))
          return res
        }

        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const handler = mod.default
          if (typeof handler !== 'function') {
            res.statusCode = 500
            res.end(JSON.stringify({ error: `No default export in /api/${name}.ts` }))
            return
          }
          await handler(req, res)
        } catch (err) {
          const msg = String(err && err.message ? err.message : err)
          server.config.logger.error(`[dev-api] /api/${name}: ${msg}`)
          if (!res.headersSent) {
            res.statusCode = /Cannot find|Failed to load url|ENOENT|Unknown variable/.test(msg)
              ? 404
              : 500
            res.end(JSON.stringify({ error: 'dev api error — see the dev-server terminal' }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env.local / .env (ALL keys, not just VITE_*) and expose them to the
  // dev API handlers through process.env, mirroring how Vercel injects env vars.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), devApiPlugin()],
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
  }
})
