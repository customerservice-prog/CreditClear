import { createRequire } from 'node:module'
import { applyCors } from './_lib/cors.js'
import { parseCreditReportText } from './_lib/credit-report-parser.js'
import { deleteExistingReport, findExistingReportForUpload, persistParsedReport } from './_lib/credit-report-store.js'
import { extractTextFromImageBuffer, MAX_IMAGE_PARSE_BYTES } from './_lib/image-ocr.js'
import { ApiError, sendError } from './_lib/http.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'
import { assertUuid } from './_lib/validation.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const BUCKET = 'private-uploads'
const MAX_PDF_BYTES = 9 * 1024 * 1024

/**
 * Parse an already-uploaded PDF or credit-report screenshot into structured
 * tradeline / inquiry / public-record rows. Screenshots run through OCR
 * (tesseract.js + sharp). Idempotent: re-running replaces the prior row.
 *
 * Request body: { uploadId: uuid }
 * Response:     { reportId, bureau, tradelineCount, inquiryCount, publicRecordCount }
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
    const isPdf = mime === 'application/pdf'
    const isImage = mime.startsWith('image/')

    if (!isPdf && !isImage) {
      throw new ApiError(409, 'Only PDF or image uploads (PNG, JPG, WebP, HEIC, etc.) can be parsed.', {
        expose: true,
      })
    }

    if (isPdf && upload.file_size > MAX_PDF_BYTES) {
      throw new ApiError(413, 'PDF is too large to parse automatically.', { expose: true })
    }
    if (isImage && upload.file_size > MAX_IMAGE_PARSE_BYTES) {
      throw new ApiError(413, 'Image is too large to parse automatically.', { expose: true })
    }

    const downloadResult = await supabaseAdmin.storage.from(BUCKET).download(upload.file_path)
    if (downloadResult.error || !downloadResult.data) {
      throw new ApiError(500, 'Could not download the upload from storage.', { expose: false })
    }
    const buffer = Buffer.from(await downloadResult.data.arrayBuffer())

    let extractedText = ''
    let parseSource = 'pdf_text'

    if (isPdf) {
      try {
        const parsed = await pdfParse(buffer)
        extractedText = typeof parsed.text === 'string' ? parsed.text : ''
      } catch {
        throw new ApiError(422, 'Could not read text from this PDF (it may be a scanned image — try uploading screenshots as images instead).', {
          expose: true,
        })
      }
    } else {
      parseSource = 'image_ocr'
      try {
        extractedText = await extractTextFromImageBuffer(buffer, mime)
      } catch (err) {
        if (err.code === 'IMAGE_DECODE_FAILED') {
          throw new ApiError(422, 'Could not decode this image. Try PNG or JPG, or re-export the screenshot.', {
            expose: true,
          })
        }
        throw err
      }
    }

    if (!extractedText.trim()) {
      throw new ApiError(
        422,
        isImage
          ? 'No text could be read from this image. Try a sharper, brighter screenshot or a downloaded PDF.'
          : 'No text could be extracted from this PDF (likely scanned image — upload pages as photos instead).',
        { expose: true },
      )
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
          parseSource,
        },
      })

    response.status(200).json({
      reportId: persisted.reportId,
      bureau: persisted.bureau,
      tradelineCount: persisted.tradelineCount,
      inquiryCount: persisted.inquiryCount,
      publicRecordCount: persisted.publicRecordCount,
      parseSource,
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
