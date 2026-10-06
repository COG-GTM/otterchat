import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

const API_ROUTE = '/api/fire-feedback'

/** Serves the Vercel Function at {@link API_ROUTE} during `vite dev`. */
function vercelFunctionDev(): Plugin {
  return {
    name: 'vercel-function-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(API_ROUTE, async (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        try {
          const { POST } = (await server.ssrLoadModule(`.${API_ROUTE}.ts`)) as {
            POST: (request: Request) => Promise<Response>
          }
          const response = await POST(
            new Request(`http://localhost${API_ROUTE}`, {
              method: 'POST',
              headers: { 'content-type': req.headers['content-type'] ?? 'application/json' },
              body: Buffer.concat(chunks),
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
