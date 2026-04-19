import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function publicEnvScript() {
  return {
    name: 'public-env-js',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/env.js') {
          const publicEnv: Record<string, string> = {}
          for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith('VITE_') && typeof value === 'string' && value.length > 0) {
              publicEnv[key] = value
            }
          }
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(`window.__ENV__=${JSON.stringify(publicEnv)};`)
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), publicEnvScript()],
})
