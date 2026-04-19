import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error Node ESM helper has no TS typedef (see server/public-browser-env.mjs)
import { getPublicBrowserEnv } from './server/public-browser-env.mjs'

function publicEnvScript() {
  return {
    name: 'public-env-js',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/env.js') {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(`window.__ENV__=${JSON.stringify(getPublicBrowserEnv())};`)
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
