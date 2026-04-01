import { ensureAccountState } from './_lib/account.js'
import { applyCors } from './_lib/cors.js'
import { ApiError, sendError } from './_lib/http.js'
import { supabaseAdmin } from './_lib/supabase-admin.js'
import { assertEmail, assertNonEmptyString, sanitizeText } from './_lib/validation.js'

export default async function handler(request, response) {
  if (applyCors(request, response)) {
    return
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const name = assertNonEmptyString(request.body?.name, 'Full name', { maxLength: 120 })
    const email = assertEmail(request.body?.email)
    const password = sanitizeText(request.body?.password, { maxLength: 128 })

    if (password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters.')
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: name,
      },
    })

    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        throw new ApiError(409, 'An account with that email already exists. Try signing in instead.')
      }

      throw new ApiError(500, 'Unable to create your account.', { expose: false })
    }

    if (!data.user) {
      throw new ApiError(500, 'Unable to create your account.', { expose: false })
    }

    await ensureAccountState(data.user)
    response.status(200).json({ created: true })
  } catch (error) {
    sendError(response, error, 'Unable to create your account.')
  }
}
