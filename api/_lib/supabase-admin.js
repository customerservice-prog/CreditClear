import { createClient } from '@supabase/supabase-js'
import { getRequiredEnv } from './env.js'
import { ApiError } from './http.js'

export const supabaseAdmin = createClient(
  getRequiredEnv('SUPABASE_URL'),
  getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function getAuthenticatedUser(request) {
  const authorization = request.headers.authorization || ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    throw new ApiError(401, 'Authentication required.')
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    throw new ApiError(401, 'Your session is no longer valid.')
  }

  return data.user
}
