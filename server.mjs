import { createReadStream, existsSync } from 'node:fs'
import { stat, readFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BLOG_POSTS } from './server/blog-slugs.mjs'
import { getCrawlerHtml } from './server/crawler-html.mjs'
import { getPublicBrowserEnv } from './server/public-browser-env.mjs'
import { APEX_HOST, isSearchOrPreviewBot, requestHostname, SITE_ORIGIN } from './server/seo-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const indexPath = path.join(distDir, 'index.html')
const rawBodyRoutes = new Set(['/api/stripe-webhook', '/api/webhook'])

const apiHandlers = {
  '/api/account-delete': () => import('./api/account-delete.js'),
  '/api/account-export': () => import('./api/account-export.js'),
  '/api/billing-status': () => import('./api/billing-status.js'),
  '/api/bootstrap-user': () => import('./api/bootstrap-user.js'),
  '/api/create-account': () => import('./api/create-account.js'),
  '/api/create-checkout': () => import('./api/create-checkout.js'),
  '/api/create-portal': () => import('./api/create-portal.js'),
  '/api/generate-dispute-draft': () => import('./api/generate-dispute-draft.js'),
  '/api/generate-letters': () => import('./api/generate-letters.js'),
  '/api/mail-letter': () => import('./api/mail-letter.js'),
  '/api/parse-upload': () => import('./api/parse-upload.js'),
  '/api/pull-report': () => import('./api/pull-report.js'),
  '/api/save-upload-metadata': () => import('./api/save-upload-metadata.js'),
  '/api/stripe-webhook': () => import('./api/stripe-webhook.js'),
  '/api/waitlist': () => import('./api/waitlist.js'),
  '/api/webhook': () => import('./api/webhook.js'),
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

    const hostname = requestHostname(request)
    if (hostname === APEX_HOST) {
      const dest = `${SITE_ORIGIN}${url.pathname}${url.search}`
      response.statusCode = 301
      response.setHeader('Location', dest)
      response.end()
      return
    }

    if (url.pathname === '/robots.txt') {
      const body = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /login
Disallow: /signup
Disallow: /reset-password

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`
      response.statusCode = 200
      response.setHeader('Content-Type', 'text/plain; charset=utf-8')
      response.end(body)
      return
    }

    if (url.pathname === '/sitemap.xml') {
      const paths = [
        '/',
        '/pricing',
        '/contact',
        '/privacy',
        '/terms',
        '/disclaimer',
        '/disclosures',
        '/blog',
        ...BLOG_POSTS.map((post) => `/blog/${post.slug}`),
        '/dispute/equifax',
        '/dispute/experian',
        '/dispute/transunion',
      ]
      const urls = paths
        .map((pathname) => {
          const loc = pathname === '/' ? SITE_ORIGIN + '/' : `${SITE_ORIGIN}${pathname}`
          const priority = pathname === '/' ? '1.0' : '0.8'
          return `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>${priority}</priority></url>`
        })
        .join('\n')
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
      response.statusCode = 200
      response.setHeader('Content-Type', 'application/xml; charset=utf-8')
      response.end(xml)
      return
    }

    if (request.method === 'GET' && isSearchOrPreviewBot(request.headers['user-agent'])) {
      const crawlerHtml = getCrawlerHtml(url.pathname)
      if (crawlerHtml) {
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(crawlerHtml)
        return
      }
    }

    if (url.pathname === '/env.js') {
      response.statusCode = 200
      response.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.end(`window.__ENV__=${JSON.stringify(getPublicBrowserEnv())};`)
      return
    }

    if (url.pathname.startsWith('/api/')) {
      await handleApiRequest(url.pathname, request, response)
      return
    }

    await serveStaticAsset(url.pathname, response)
  } catch (error) {
    console.error('[server]', error instanceof Error ? error.message : 'Unknown server error.')
    if (!response.headersSent) {
      response.statusCode = 500
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
    }
    response.end(JSON.stringify({ error: 'Internal server error.' }))
  }
})

server.listen(Number(process.env.PORT) || 10000, '0.0.0.0', () => {
  console.log(`CreditClear listening on port ${process.env.PORT || 10000}`)
})

async function handleApiRequest(pathname, request, response) {
  const loadHandler = apiHandlers[pathname]
  if (!loadHandler) {
    enhanceResponse(response)
    response.status(404).json({ error: 'Not found.' })
    return
  }

  if (!rawBodyRoutes.has(pathname)) {
    request.body = await parseJsonBody(request)
  }

  enhanceResponse(response)
  const module = await loadHandler()
  await module.default(request, response)

  if (!response.writableEnded && !response.headersSent) {
    response.status(204).end()
  }
}

async function serveStaticAsset(pathname, response) {
  const safePath = normalizeStaticPath(pathname)
  const candidatePath = path.join(distDir, safePath)

  if (safePath && existsSync(candidatePath) && (await stat(candidatePath)).isFile()) {
    response.statusCode = 200
    response.setHeader('Content-Type', getContentType(candidatePath))
    setStaticCacheHeaders(safePath, response)
    createReadStream(candidatePath).pipe(response)
    return
  }

  response.statusCode = 200
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  response.end(await readFile(indexPath))
}

function setStaticCacheHeaders(safePath, response) {
  if (safePath.startsWith('assets/') && /\.(js|mjs|css|woff2?)$/i.test(safePath)) {
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  } else {
    response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
  }
}

function normalizeStaticPath(pathname) {
  const decodedPath = decodeURIComponent(pathname || '/')
  const trimmedPath = decodedPath.replace(/^\/+/, '')
  const normalizedPath = path.normalize(trimmedPath)

  if (!normalizedPath || normalizedPath === '.' || normalizedPath.startsWith('..')) {
    return ''
  }

  return normalizedPath
}

function enhanceResponse(response) {
  response.status = function status(code) {
    response.statusCode = code
    return response
  }

  response.json = function json(payload) {
    if (!response.getHeader('Content-Type')) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
    }
    response.end(JSON.stringify(payload))
    return response
  }
}

async function parseJsonBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (!chunks.length) {
    return undefined
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim()
  if (!rawBody) {
    return undefined
  }

  const contentType = String(request.headers['content-type'] || '').toLowerCase()
  if (!contentType.includes('application/json')) {
    return rawBody
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    return undefined
  }
}

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}
