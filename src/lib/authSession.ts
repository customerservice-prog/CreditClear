import { isSupabaseConfigured, requireSupabase } from './supabase'

/** Refresh the access token if it expires within this many seconds (avoids 401s during long flows). */
const REFRESH_IF_EXPIRES_WITHIN_SEC = 600

/**
 * Returns a Supabase access token suitable for `Authorization: Bearer` on `/api/*` routes.
 * Refreshes the session when the JWT is expired or close to expiring.
 */
export async function getAccessTokenForApi(): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const supabase = requireSupabase()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session?.access_token) {
    throw new Error('Please sign in again.')
  }

  const now = Math.floor(Date.now() / 1000)
  const exp = session.expires_at ?? 0
  const needsRefresh = exp <= 0 || exp - now < REFRESH_IF_EXPIRES_WITHIN_SEC

  if (needsRefresh) {
    const { data, error: refreshError } = await supabase.auth.refreshSession()
    if (data.session?.access_token) {
      return data.session.access_token
    }
    if (refreshError) {
      if (exp > now + 30) {
        return session.access_token
      }
      throw new Error('Your session expired. Please sign in again.')
    }
  }

  return session.access_token
}
