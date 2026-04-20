import { createRequire } from 'node:module'
import { applyCors } from './_lib/cors.js'
import { parseCreditReportText } from './_lib/credit-report-parser.js'
import { deleteExistingReport, findExistingReportForUpload, persistParsedReport } from './_lib/credit-report-store.js'
import { ApiError, sendError } from './_lib/http.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'
import { assertUuid } from './_lib/validation.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const BUCKET = 'private-uploads'
const MAX_PDF_BYTES = 9 * 1024 * 1024

/**
 * Parse an already-uploaded PDF into structured tradeline / inquiry / public-
 * record rows. Idempotent: re-running for the same upload replaces the prior
 * credit_reports row (and its children, via FK cascade) instead of stacking.
 *
 * Request body: { uploadId: uuid }
 * Response:     { reportId, bureau, tradelineCount, inquiryCount, publicRecordCount }
 *
 * Errors:
 *  401 — not authenticated
 *  403 — upload does not belong to caller
 *  404 — upload not found
 *  409 — upload is not a PDF (image OCR is intentionally not in scope here)
 *  413 — PDF exceeds the per-file byte limit
 *  422 — bureau could not be detected (parser returned null)
 *  500 — anything DB-side
 */
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
    assertRateLimit(`parse:${authUser.id}`, 12, 60_000)

    const body = request.body || {}
    const uploadId = assertUuid(body.uploadId, 'uploadId')

    const uploadResult = await supabaseAdmin
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (uploadResult.error) {
      throw new ApiError(500, 'Could not load the upload row.', { expose: false })
    }
    if (!uploadResult.data) {
      throw new ApiError(404, 'Upload not found.')
    }

    const upload = uploadResult.data
    const mime = String(upload.mime_type || '').toLowerCase()
    if (mime !== 'application/pdf') {
      throw new ApiError(409, 'Only PDF uploads can be parsed automatically right now.', {
        expose: true,
      })
    }
    if (upload.file_size > MAX_PDF_BYTES) {
      throw new ApiError(413, 'PDF is too large to parse automatically.', { expose: true })
    }

    const downloadResult = await supabaseAdmin.storage.from(BUCKET).download(upload.file_path)
    if (downloadResult.error || !downloadResult.data) {
      throw new ApiError(500, 'Could not download the upload from storage.', { expose: false })
    }
    const buffer = Buffer.from(await downloadResult.data.arrayBuffer())

    let extractedText = ''
    try {
      const parsed = await pdfParse(buffer)
      extractedText = typeof parsed.text === 'string' ? parsed.text : ''
    } catch {
      throw new ApiError(422, 'Could not read text from this PDF (it may be a scanned image).', {
        expose: true,
      })
    }

    if (!extractedText.trim()) {
      throw new ApiError(422, 'No text could be extracted from this PDF (likely scanned image).', {
        expose: true,
      })
    }

    const bureauHint = normalizeBureauHint(upload.report_bureau)
    const parsed = parseCreditReportText(extractedText, bureauHint ? { bureauHint } : undefined)

    if (!parsed) {
      throw new ApiError(422, 'No bureau could be detected in this report.', { expose: true })
    }

    const existingId = await findExistingReportForUpload(supabaseAdmin, {
      userId: authUser.id,
      uploadId,
    })
    if (existingId) {
      await deleteExistingReport(supabaseAdmin, existingId)
    }

    const persisted = await persistParsedReport(supabaseAdmin, {
      userId: authUser.id,
      parsed,
      uploadId,
      disputeId: upload.dispute_id || null,
      source: 'upload',
    })

    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        action: 'credit_report.parsed',
        metadata: {
          uploadId,
          reportId: persisted.reportId,
          bureau: persisted.bureau,
          tradelines: persisted.tradelineCount,
          inquiries: persisted.inquiryCount,
          publicRecords: persisted.publicRecordCount,
        },
      })

    response.status(200).json({
      reportId: persisted.reportId,
      bureau: persisted.bureau,
      tradelineCount: persisted.tradelineCount,
      inquiryCount: persisted.inquiryCount,
      publicRecordCount: persisted.publicRecordCount,
    })
  } catch (error) {
    sendError(response, error, 'Could not parse this credit report.')
  }
}

function normalizeBureauHint(value) {
  if (!value) return null
  const v = String(value).toLowerCase()
  if (v === 'equifax' || v === 'experian' || v === 'transunion') return v
  return null
}
