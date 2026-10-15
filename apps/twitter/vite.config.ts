import type { IncomingHttpHeaders } from 'node:http'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

const API_ROUTES = new Set(['/api/fire-feedback', '/api/relay'])

type Handler = (request: Request) => Response | Promise<Response>

function toHeaders(incoming: IncomingHttpHeaders) {
  const headers = new Headers()
  for (const [name, value] of Object.entries(incoming)) {
    if (typeof value === 'string') headers.set(name, value)
  }
  return headers
}

/** Serves the Vercel Functions in {@link API_ROUTES} during `vite dev`. */
function vercelFunctionDev(): Plugin {
  return {
    name: 'vercel-function-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!API_ROUTES.has(url.pathname)) {
          next()
          return
        }
        try {
          const handlers = (await server.ssrLoadModule(`.${url.pathname}.ts`)) as Record<
            string,
            Handler | undefined
          >
          const method = req.method ?? 'GET'
          const handler = handlers[method]
          if (!handler) {
            res.statusCode = 405
            res.end()
            return
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const response = await handler(
            new Request(url, {
              method,
              headers: toHeaders(req.headers),
              body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
            }),
          )
          res.statusCode = response.status
          res.setHeader('content-type', response.headers.get('content-type') ?? 'application/json')
          res.end(await response.text())
        } catch (error) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(error) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), vercelFunctionDev()],
})
