import { ensureAccountState } from './_lib/account.js'
import { applyCors } from './_lib/cors.js'
import { sendError } from './_lib/http.js'
import { getAuthenticatedUser } from './_lib/supabase-admin.js'

export default async function handler(request, response) {
  if (applyCors(request, response)) {
    return
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const authUser = await getAuthenticatedUser(request)
    const { appUser } = await ensureAccountState(authUser)
    response.status(200).json({ user: appUser })
  } catch (error) {
    sendError(response, error, 'Unable to prepare your account.')
  }
}
