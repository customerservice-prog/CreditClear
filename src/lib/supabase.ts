import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const AUTH_REFRESH_TOKEN_TIMEOUT_MS = 10_000
/** When grant_type cannot be read (opaque Request body), cap wait so a stuck refresh cannot hang forever. */
const AUTH_TOKEN_FALLBACK_TIMEOUT_MS = 25_000
const AUTH_USER_LOGOUT_TIMEOUT_MS = 20_000
const DEFAULT_FETCH_TIMEOUT_MS = 15_000

function grantTypeFromInit(init?: RequestInit): string | undefined {
  if (!init?.body) {
    return undefined
  }
  if (typeof init.body === 'string') {
    try {
      return new URLSearchParams(init.body).get('grant_type') ?? undefined
    } catch {
      return undefined
    }
  }
  if (init.body instanceof URLSearchParams) {
    return init.body.get('grant_type') ?? undefined
  }
  return undefined
}

/** GoTrue often puts `grant_type` in the query string (e.g. …/token?grant_type=password), not only the body. */
function grantTypeFromUrl(rawUrl: string): string | undefined {
  if (!rawUrl.includes('grant_type=')) {
    return undefined
  }
  try {
    const parsed = new URL(rawUrl, 'https://auth.local')
    return parsed.searchParams.get('grant_type') ?? undefined
  } catch {
    return undefined
  }
}

function fetchWithAbort(
  input: Parameters<typeof fetch>[0],
  init: RequestInit | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'AbortError'))
  }, timeoutMs)

  const signals: AbortSignal[] = [controller.signal]
  if (init?.signal) {
    signals.push(init.signal)
  }
  const merged =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function'
      ? AbortSignal.any(signals)
      : controller.signal

  return fetch(input, {
    ...init,
    signal: merged,
  }).finally(() => {
    window.clearTimeout(timer)
  })
}

const fetchWithTimeout: typeof fetch = (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : ''
  const grantType = grantTypeFromInit(init) ?? grantTypeFromUrl(url)

  if (url.includes('/auth/v1/token')) {
    if (grantType === 'refresh_token') {
      return fetchWithAbort(input, init, AUTH_REFRESH_TOKEN_TIMEOUT_MS)
    }
    if (grantType) {
      // Password, PKCE, etc. — use native fetch so our refresh timeout never cancels sign-in.
      return fetch(input, init)
    }
    return fetchWithAbort(input, init, AUTH_TOKEN_FALLBACK_TIMEOUT_MS)
  }

  if (url.includes('/auth/v1/user') || url.includes('/auth/v1/logout')) {
    return fetchWithAbort(input, init, AUTH_USER_LOGOUT_TIMEOUT_MS)
  }

  return fetchWithAbort(input, init, DEFAULT_FETCH_TIMEOUT_MS)
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  })
  : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  return supabase
}
