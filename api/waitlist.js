import { applyCors } from './_lib/cors.js'
import { ApiError, sendError } from './_lib/http.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'
import { assertEmail, sanitizeText } from './_lib/validation.js'

const ALLOWED_FEATURE_IDS = new Set([
  'bureau_connect',
  'tradeline_editing',
  'letter_types_six',
  'certified_mail',
  'score_simulator',
  'pro_dashboard',
  'round_tracking_2_4',
  'stripe_checkout',
  'founders_waitlist',
])

export default async function handler(request, response) {
  if (applyCors(request, response)) {
    return
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const body = request.body || {}
    const email = assertEmail(body.email, 'Email')
    const featureId = sanitizeText(body.featureId, { maxLength: 64 })
    if (!ALLOWED_FEATURE_IDS.has(featureId)) {
      throw new ApiError(400, 'Unknown waitlist feature.')
    }
    const source = sanitizeText(body.source, { maxLength: 120 })
    const userAgent = sanitizeText(request.headers['user-agent'] || '', { maxLength: 240 })

    let userId = null
    if (request.headers.authorization) {
      try {
        const authUser = await getAuthenticatedUser(request)
        userId = authUser.id
      } catch {
        userId = null
      }
    }

    const insert = await supabaseAdmin
      .from('waitlist_signups')
      .insert({
        email,
        feature_id: featureId,
        source: source || null,
        user_agent: userAgent || null,
        user_id: userId,
      })

    if (insert.error) {
      throw new ApiError(500, 'Could not save your spot. Please try again.', { expose: true })
    }

    response.status(200).json({ ok: true })
  } catch (error) {
    sendError(response, error, 'Could not save your spot. Please try again.')
  }
}
