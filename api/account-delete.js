import { applyCors } from './_lib/cors.js'
import { ApiError, sendError } from './_lib/http.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'
import { sanitizeText } from './_lib/validation.js'

/**
 * POST /api/account-delete
 *
 * Marks the authenticated user's profile for deletion and writes an audit
 * row. The actual delete runs after a 7-day grace window so the user can
 * cancel the request — that grace job is operationally driven for now
 * (cron / manual review). The endpoint refuses to delete unless the body
 * includes `confirm: "DELETE MY ACCOUNT"` to prevent accidental clicks.
 *
 * On confirmation:
 *   - audit_logs insert with event_type='account.delete_requested'
 *   - profiles.deletion_requested_at set to NOW()
 *
 * RLS / FK cascades take care of the actual row removal at execution time.
 */
export default async function handler(request, response) {
  if (applyCors(request, response)) return

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const user = await getAuthenticatedUser(request)
    await assertRateLimit({ key: `account-delete:${user.id}`, limit: 4, windowMs: 60_000 })

    const body = request.body || {}
    const confirm = sanitizeText(body.confirm, { maxLength: 64 })
    if (confirm !== 'DELETE MY ACCOUNT') {
      throw new ApiError(400, 'To confirm deletion, send { confirm: "DELETE MY ACCOUNT" } in the request body.')
    }

    const reason = sanitizeText(body.reason, { maxLength: 500 })

    const update = await supabaseAdmin
      .from('profiles')
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq('id', user.id)

    if (update.error) {
      // Some environments may not have run the migration yet; surface a helpful error.
      throw new ApiError(500, 'Could not mark your account for deletion. Please email support@creditclearai.com.', { expose: true })
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      event_type: 'account.delete_requested',
      metadata: { reason: reason || null, source: 'api/account-delete' },
    })

    response.status(200).json({
      ok: true,
      grace_period_days: 7,
      message:
        'Your account is scheduled for deletion. We will permanently remove your data after a 7-day grace period. Email support@creditclearai.com to cancel the request.',
    })
  } catch (error) {
    sendError(response, error, 'Could not request account deletion.')
  }
}
