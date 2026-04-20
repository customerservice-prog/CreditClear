import { applyCors } from './_lib/cors.js'
import { AGGREGATOR_BUREAUS, isAggregatorEnabled, pullAggregatorReport } from './_lib/aggregator-stub.js'
import { persistParsedReport } from './_lib/credit-report-store.js'
import { ApiError, sendError } from './_lib/http.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'

/**
 * Pull a bureau report through the aggregator stub (or a real aggregator once
 * AGGREGATOR_ENABLED is flipped on with a real partner integration). Persists
 * the resulting credit_reports + tradelines + inquiries + public_records via
 * the same store path used by the PDF parser, so the front-end /credit-reports
 * page surfaces the rows identically.
 *
 * Request body: { bureau: 'equifax' | 'experian' | 'transunion' }
 * Response:     { reportId, bureau, source, tradelineCount, inquiryCount, publicRecordCount }
 *
 * Errors:
 *  401 — not authenticated
 *  422 — invalid bureau
 *  503 — aggregator disabled (set AGGREGATOR_ENABLED=true to enable)
 *  500 — anything DB-side
 */
export default async function handler(request, response) {
  if (applyCors(request, response)) return

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    if (!isAggregatorEnabled()) {
      response.status(503).json({
        error:
          "Bureau-aggregator pulls aren't enabled in this environment yet. Until then, upload a credit-report PDF and we'll parse it for you.",
        code: 'aggregator_disabled',
      })
      return
    }

    const authUser = await getAuthenticatedUser(request)
    assertRateLimit(`pull-report:${authUser.id}`, 6, 60_000)

    const body = request.body || {}
    const bureau = String(body.bureau || '').toLowerCase()
    if (!AGGREGATOR_BUREAUS.includes(bureau)) {
      throw new ApiError(422, 'Provide a bureau: equifax, experian, or transunion.', { expose: true })
    }

    const parsed = pullAggregatorReport({ bureau, userId: authUser.id })

    const persisted = await persistParsedReport(supabaseAdmin, {
      userId: authUser.id,
      parsed,
      uploadId: null,
      disputeId: null,
      source: 'aggregator',
    })

    await supabaseAdmin.from('audit_logs').insert({
      user_id: authUser.id,
      action: 'credit_report.pulled_via_aggregator',
      metadata: {
        reportId: persisted.reportId,
        bureau: persisted.bureau,
        tradelines: persisted.tradelineCount,
        inquiries: persisted.inquiryCount,
        publicRecords: persisted.publicRecordCount,
        aggregator: 'stub',
      },
    })

    response.status(200).json({
      reportId: persisted.reportId,
      bureau: persisted.bureau,
      source: persisted.source,
      tradelineCount: persisted.tradelineCount,
      inquiryCount: persisted.inquiryCount,
      publicRecordCount: persisted.publicRecordCount,
    })
  } catch (error) {
    sendError(response, error, 'Could not pull this credit report.')
  }
}
