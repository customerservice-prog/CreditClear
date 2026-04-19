/** Canonical public origin (www). Override with PUBLIC_SITE_ORIGIN if needed. */
export const SITE_ORIGIN = (process.env.PUBLIC_SITE_ORIGIN || 'https://www.creditclearai.com').replace(
  /\/$/,
  '',
)

export const APEX_HOST = 'creditclearai.com'
export const WWW_HOST = 'www.creditclearai.com'

export function requestHostname(request) {
  const raw = request.headers['x-forwarded-host'] || request.headers.host || ''
  const first = Array.isArray(raw) ? raw[0] : raw
  return String(first).split(':')[0].toLowerCase()
}

export function isHttpsRequest(request) {
  const proto = request.headers['x-forwarded-proto']
  if (proto === 'https') {
    return true
  }
  if (proto === 'http') {
    return false
  }
  return false
}

const BOT_UA =
  /googlebot|google-inspectiontool|adsbot-google|mediapartners-google|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|bytespider|pinterest|embedly/i

export function isSearchOrPreviewBot(userAgent) {
  return BOT_UA.test(String(userAgent || ''))
}
