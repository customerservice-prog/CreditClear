export function applyCors(request, response, methods = ['POST']) {
  const allowedOrigins = getAllowedOrigins()
  const origin = request.headers.origin

  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) {
    response.status(403).json({ error: 'This origin is not allowed.' })
    return true
  }

  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', methods.join(', '))

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return true
  }

  return false
}

function getAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return [...new Set([
    process.env.APP_URL,
    process.env.VITE_APP_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    ...configured,
  ].filter(Boolean))]
}
