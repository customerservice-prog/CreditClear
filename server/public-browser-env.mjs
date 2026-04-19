/**
 * Keys exposed to the browser via `/env.js` (window.__ENV__). Never put secrets here.
 */
export function getPublicBrowserEnv() {
  const publicEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('VITE_') && typeof value === 'string' && value.length > 0) {
      publicEnv[key] = value
    }
  }
  for (const key of ['OWNER_FREE_ACCESS_EMAILS', 'ADMIN_EMAIL']) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      publicEnv[key] = value.trim()
    }
  }
  return publicEnv
}
