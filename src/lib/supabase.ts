import { createClient } from '@supabase/supabase-js'
import { getPublicEnv } from './publicEnv'

const supabaseUrl = getPublicEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = getPublicEnv('VITE_SUPABASE_ANON_KEY')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * All `/auth/v1/token` grants (password, refresh, PKCE). Bounded so the login UI cannot hang forever;
 * 45s covers slow networks while staying responsive on a warm project.
 */
const AUTH_GOTRUE_TOKEN_TIMEOUT_MS = 45_000
const AUTH_SETTINGS_TIMEOUT_MS = 25_000
const AUTH_USER_LOGOUT_TIMEOUT_MS = 15_000
/** PostgREST / storage can exceed 15s; aborting mid-request often surfaces as net::ERR_HTTP2_PROTOCOL_ERROR. */
const REST_FETCH_TIMEOUT_MS = 120_000
const DEFAULT_FETCH_TIMEOUT_MS = 15_000

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

  if (url.includes('/auth/v1/token')) {
    return fetchWithAbort(input, init, AUTH_GOTRUE_TOKEN_TIMEOUT_MS)
  }

  if (url.includes('/auth/v1/settings')) {
    return fetchWithAbort(input, init, AUTH_SETTINGS_TIMEOUT_MS)
  }

  if (url.includes('/auth/v1/user') || url.includes('/auth/v1/logout')) {
    return fetchWithAbort(input, init, AUTH_USER_LOGOUT_TIMEOUT_MS)
  }

  if (url.includes('/rest/v1/') || url.includes('/storage/v1/')) {
    return fetchWithAbort(input, init, REST_FETCH_TIMEOUT_MS)
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
