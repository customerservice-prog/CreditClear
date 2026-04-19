import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const AUTH_REFRESH_TOKEN_TIMEOUT_MS = 10_000
const AUTH_PASSWORD_TOKEN_TIMEOUT_MS = 45_000
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

const fetchWithTimeout: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
  const grantType = grantTypeFromInit(init)

  let timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
  if (url.includes('/auth/v1/token')) {
    if (grantType === 'refresh_token') {
      timeoutMs = AUTH_REFRESH_TOKEN_TIMEOUT_MS
    } else if (grantType === 'password') {
      timeoutMs = AUTH_PASSWORD_TOKEN_TIMEOUT_MS
    } else if (grantType) {
      timeoutMs = AUTH_PASSWORD_TOKEN_TIMEOUT_MS
    } else {
      timeoutMs = AUTH_TOKEN_FALLBACK_TIMEOUT_MS
    }
  } else if (url.includes('/auth/v1/user') || url.includes('/auth/v1/logout')) {
    timeoutMs = AUTH_USER_LOGOUT_TIMEOUT_MS
  }

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
