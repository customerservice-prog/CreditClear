import { applyCors } from './_lib/cors.js'
import { sendError } from './_lib/http.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'

/**
 * GET /api/account-export
 *
 * Returns a JSON dump of every row CreditClear holds for the authenticated
 * user, plus a manifest of their uploaded files (path + name + size; not the
 * file bytes themselves — those stay in private-uploads storage and can be
 * downloaded individually). This satisfies the GDPR/CCPA "right of access"
 * surface and CROA-mandated transparency obligations.
 *
 * The endpoint also writes an audit_logs row so you can later prove a user
 * exercised their data-access right and when.
 */
export default async function handler(request, response) {
  if (applyCors(request, response)) return

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const user = await getAuthenticatedUser(request)
    await assertRateLimit({ key: `account-export:${user.id}`, limit: 6, windowMs: 60_000 })

    const userId = user.id

    const [profile, subscription, disputes, letters, uploads, reports, tradelines, inquiries, publicRecords, waitlistSignups] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('disputes').select('*').eq('user_id', userId),
      supabaseAdmin.from('letters').select('*').eq('user_id', userId),
      supabaseAdmin.from('uploads').select('*').eq('user_id', userId),
      safeSelect('credit_reports', userId),
      safeSelect('tradelines', userId),
      safeSelect('report_inquiries', userId),
      safeSelect('report_public_records', userId),
      safeSelect('waitlist_signups', userId),
    ])

    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      event_type: 'account.exported',
      metadata: { source: 'api/account-export' },
    })

    response.status(200).setHeader('Content-Type', 'application/json')
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="creditclear-export-${userId}-${new Date().toISOString().slice(0, 10)}.json"`,
    )
    response.send(
      JSON.stringify(
        {
          export_version: 1,
          exported_at: new Date().toISOString(),
          user: { id: userId, email: user.email },
          profile: profile.data ?? null,
          subscription: subscription.data ?? null,
          disputes: disputes.data ?? [],
          letters: letters.data ?? [],
          uploads: uploads.data ?? [],
          credit_reports: reports,
          tradelines,
          report_inquiries: inquiries,
          report_public_records: publicRecords,
          waitlist_signups: waitlistSignups,
          notes: [
            'This export contains every CreditClear row keyed to your user id.',
            'Uploaded credit-report files are stored in private-uploads storage; their paths are listed in the uploads array. Use those paths to download the binary files individually.',
          ],
        },
        null,
        2,
      ),
    )
  } catch (error) {
    sendError(response, error, 'Could not export your account data.')
  }
}

async function safeSelect(table, userId) {
  const result = await supabaseAdmin.from(table).select('*').eq('user_id', userId)
  if (result.error) {
    if (result.error.code === '42P01') {
      return [] // table doesn't exist yet (migration not applied)
    }
    return []
  }
  return result.data ?? []
}
