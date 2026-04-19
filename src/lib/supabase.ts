import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const AUTH_FETCH_TIMEOUT_MS = 8000
const DEFAULT_FETCH_TIMEOUT_MS = 15000

const fetchWithTimeout: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
  const timeoutMs =
    url.includes('/auth/v1/token') || url.includes('/auth/v1/user') || url.includes('/auth/v1/logout')
      ? AUTH_FETCH_TIMEOUT_MS
      : DEFAULT_FETCH_TIMEOUT_MS

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

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
