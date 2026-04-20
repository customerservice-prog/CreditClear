import { applyCors } from './_lib/cors.js'
import { assertPremiumAccess, ensureAccountState } from './_lib/account.js'
import { extractTextFromBureauUploads } from './_lib/extract-report-text.js'
import { normalizeGenerationRequest } from './_lib/generation.js'
import { ApiError, sendError, toSseErrorMessage } from './_lib/http.js'
import { LETTER_TYPE_META, buildLetterText, letterSubject } from './_lib/letter-templates.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'
import { sanitizeText } from './_lib/validation.js'

const AGENCIES = {
  equifax: 'Equifax',
  experian: 'Experian',
  transunion: 'TransUnion',
}

const ISSUES = {
  late: { label: 'Late Payments', icon: '⏰' },
  coll: { label: 'Collections', icon: '📋' },
  inq: { label: 'Hard Inquiries', icon: '🔍' },
  id: { label: 'Identity Errors', icon: '👤' },
  dup: { label: 'Duplicate Accounts', icon: '📂' },
  bal: { label: 'Wrong Balances', icon: '💰' },
  bk: { label: 'Bankruptcy', icon: '⚖️' },
  repo: { label: 'Repossessions', icon: '🚗' },
  jud: { label: 'Judgments / Liens', icon: '🔨' },
  cl: { label: 'Closed Accounts', icon: '🔒' },
  sl: { label: 'Student Loans', icon: '🎓' },
  med: { label: 'Medical Debt', icon: '🏥' },
}

/* eslint-disable */
/** @deprecated retained only as a fallback hint for legacy paths; live letters now route through letter-templates.js */
const ISSUE_DISPUTE_PARAGRAPH = {
  late: (agencyName) =>
    `I dispute the reported late-payment history associated with the account identified in this letter. Furnishers must report accurate payment history under 15 U.S.C. § 1681s-2. If any late payment notation on my ${agencyName} file cannot be verified as 100% accurate and complete for this tradeline, I request deletion or correction following a reasonable reinvestigation under 15 U.S.C. § 1681i.`,
  coll: (agencyName) =>
    `I dispute the reported collection tradeline(s) on my ${agencyName} file. If this collection cannot be validated with complete and accurate information (including the right to validation under the Fair Debt Collection Practices Act, 15 U.S.C. § 1692g, where applicable), I request deletion or correction and disclosure of the outcome of your reinvestigation.`,
  inq: (agencyName) =>
    `I dispute one or more hard inquiries on my ${agencyName} file. Permissible purpose and authorization for each inquiry must be supportable. For any inquiry I did not authorize or that is otherwise reported incorrectly, I request deletion after reinvestigation under the FCRA.`,
  id: (agencyName) =>
    `I dispute identity and header information on my ${agencyName} file (names, aliases, addresses, merged files, or mixed records) that may confuse my creditworthiness with another person’s. I request reinvestigation and correction of all inaccurate or incomplete identity data.`,
  dup: (agencyName) =>
    `I dispute duplicate tradelines or multiple listings of the same obligation on my ${agencyName} file. Duplicate reporting can distort utilization and payment history; I request consolidation or removal of erroneous duplicates after verification with the furnisher(s).`,
  bal: (agencyName) =>
    `I dispute reported balances, credit limits, and high-balance figures on my ${agencyName} file. Inaccurate balances or limits affect scores and disclosures; I request reinvestigation and correction wherever amounts cannot be verified as complete and accurate.`,
  bk: (agencyName) =>
    `I dispute bankruptcy public-record or tradeline information on my ${agencyName} file (including chapter, filing/discharge dates, liability amounts, or status). I request verification and correction of any detail that is obsolete, incomplete, or cannot be confirmed from court or other reliable records.`,
  repo: (agencyName) =>
    `I dispute repossession or voluntary-surrender reporting on my ${agencyName} file. I request reinvestigation; if any status, balance, or date is unverifiable or reported in error, I request deletion or correction.`,
  jud: (agencyName) =>
    `I dispute judgment or lien public-record data on my ${agencyName} file. I request reinvestigation and correction if any amount, filing date, satisfaction, or status is reported incorrectly or cannot be verified.`,
  cl: (agencyName) =>
    `I dispute how closed account(s) are characterized on my ${agencyName} file (closed date, payment history, charge-off/payoff coding). I request correction of any closed-account information that cannot be fully verified.`,
  sl: (agencyName) =>
    `I dispute student-loan tradeline(s) on my ${agencyName} file (balance, status, duplicates between servicers). I request reinvestigation and correction after communication with the loan holder/servicer as needed.`,
  med: (agencyName) =>
    `I dispute medical-debt reporting on my ${agencyName} file, including balance, provider, insurance status, and collection placement. I request correction or deletion of items that cannot be verified in accordance with consumer-reporting standards.`,
}
/* eslint-enable */

function uploadsForAgency(resolvedUploads, agency) {
  return resolvedUploads.filter((row) => {
    const tag = row.report_bureau
    return !tag || tag === 'combined' || tag === agency
  })
}

function buildDraftPayloadJson(normalizedRequest, resolvedUploads, extractedByAgency) {
  const agencies = normalizedRequest.agencies?.length
    ? normalizedRequest.agencies
    : Object.keys(AGENCIES)
  const issues = normalizedRequest.issues?.length ? normalizedRequest.issues : Object.keys(ISSUES)
  const info = normalizedRequest.info || {}
  const issueDetails = normalizedRequest.issueDetails || {}
  const letterType = normalizedRequest.letterType || 'bureau_initial'
  const typeMeta = LETTER_TYPE_META[letterType] || LETTER_TYPE_META.bureau_initial
  const letterList = []

  for (const agency of agencies) {
    const forBureau = uploadsForAgency(resolvedUploads, agency)
    void (extractedByAgency[agency] || {}) // raw text is intentionally not pasted into letters; PR 3 stores it on credit_reports

    for (const issue of issues) {
      const issueMeta = ISSUES[issue] || { label: issue }
      const issueDetail = issueDetails[issue] || null

      const text = buildLetterText({
        type: letterType,
        agency,
        info,
        issueMeta,
        issueDetail,
        forBureau,
      })

      letterList.push({
        agency,
        issue,
        subject: letterSubject({ type: letterType, agency, issueMeta }),
        text,
      })
    }
  }

  const summary = `${typeMeta.label} drafts (${typeMeta.citation}). Read every line carefully before mailing — accuracy is your responsibility. ${
    typeMeta.targetKind === 'bureau'
      ? 'Each letter is addressed to the bureau and ready to mail.'
      : typeMeta.targetKind === 'cfpb'
        ? 'CFPB complaints are submitted online at consumerfinance.gov/complaint — paste the generated text into the portal fields.'
        : 'Replace the bracketed furnisher / collector / creditor address before mailing — confirm the current mailing address on the company\'s website.'
  }`

  return JSON.stringify({
    recommendations: [
      'Read every line of each letter before mailing — accuracy is your responsibility.',
      'Mail via certified mail with return receipt; keep your green card and tracking receipt.',
      'Wait at least 30 days before sending the next round (MOV, furnisher, CFPB).',
    ],
    letters: letterList,
    summary,
  })
}

function extraRecommendationsFromUploads(normalizedRequest, resolvedUploads) {
  if (!normalizedRequest.fileIds.length || !resolvedUploads.length) {
    return []
  }

  const extra = []
  for (const agency of normalizedRequest.agencies) {
    const forBureau = uploadsForAgency(resolvedUploads, agency)
    if (forBureau.length === 0) {
      extra.push(
        `No uploaded file is labeled for ${AGENCIES[agency] || agency}. Open Credit Reports, label each file, or use Combined for a single 3-bureau report — then regenerate if needed.`,
      )
    }
  }
  return extra
}

function extractionHints(normalizedRequest, resolvedUploads, extractedByAgency) {
  const hints = []
  for (const agency of normalizedRequest.agencies) {
    const rows = uploadsForAgency(resolvedUploads, agency)
    const hasPdf = rows.some((r) => String(r.mime_type || '').toLowerCase() === 'application/pdf')
    const ex = extractedByAgency[agency] || { text: '', pdfFilesTried: 0 }
    if (hasPdf && ex.pdfFilesTried > 0 && !String(ex.text || '').trim()) {
      hints.push(
        `Little or no text was read from your ${AGENCIES[agency] || agency} PDF (common with scanned/image PDFs). Download a text-selectable report from the bureau, re-upload, or fill the tradeline prompts in the letter manually.`,
      )
    }
  }
  return hints
}

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
    assertRateLimit(`${authUser.id}:${request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown'}`)
    const { subscription } = await ensureAccountState(authUser)
    assertPremiumAccess(subscription)
    const normalizedRequest = normalizeGenerationRequest(request.body || {})
    const resolvedUploads = await resolveOwnedUploads(normalizedRequest.fileIds, authUser.id)

    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    response.setHeader('Cache-Control', 'no-cache, no-transform, no-store')
    response.setHeader('Connection', 'keep-alive')
    response.setHeader('X-Accel-Buffering', 'no')
    response.setHeader('X-Buffered', 'no')

    sendEvent(response, { type: 'status', message: 'Scanning uploaded materials...' })

    const extractionCache = new Map()
    const extractedByAgency = {}
    for (const agency of normalizedRequest.agencies) {
      const rows = uploadsForAgency(resolvedUploads, agency)
      const label = AGENCIES[agency] || agency
      sendEvent(response, { type: 'status', message: `Reading ${label} report PDF text…` })
      extractedByAgency[agency] = await extractTextFromBureauUploads(supabaseAdmin, rows, extractionCache)
    }

    sendEvent(response, { type: 'status', message: 'Drafting dispute letters…' })

    const text = buildDraftPayloadJson(normalizedRequest, resolvedUploads, extractedByAgency)

    const parsed = safeJsonParse(text)
    const letters = normalizeLetters(parsed?.letters || [], normalizedRequest.agencies, normalizedRequest.issues)
    const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : ''
    const recommendations = [
      ...(Array.isArray(parsed?.recommendations)
        ? parsed.recommendations.map((value) => String(value).trim()).filter(Boolean)
        : []),
      ...extraRecommendationsFromUploads(normalizedRequest, resolvedUploads),
      ...extractionHints(normalizedRequest, resolvedUploads, extractedByAgency),
    ]

    if (!letters.length) {
      throw new ApiError(502, 'Draft generation returned no letters. Please try again.', { expose: true })
    }

    sendEvent(response, { type: 'status', message: 'Finalizing letters for download...' })

    for (const letter of letters) {
      sendEvent(response, { type: 'letter', letter })
      await wait(50)
    }

    sendEvent(response, { type: 'complete', letters, recommendations, summary })
    response.end()
  } catch (error) {
    if (!response.headersSent) {
      sendError(response, error, 'Unable to generate letters.')
      return
    }

    sendEvent(response, {
      type: 'error',
      message: toSseErrorMessage(error, 'Unable to generate letters. Please try again.'),
    })
    response.end()
  }
}

function normalizeLetters(rawLetters, agencies, issues) {
  const expectedCount = Math.max(1, agencies.length * issues.length)

  return rawLetters.slice(0, expectedCount).map((letter, index) => {
    const agency = agencies.includes(letter.agency) ? letter.agency : agencies[index % agencies.length] || 'equifax'
    const issue = issues.includes(letter.issue) ? letter.issue : issues[index % issues.length] || 'late'
    const issueMeta = ISSUES[issue] || { icon: '📄', label: issue }

    return {
      agency,
      agencyName: AGENCIES[agency] || agency,
      id: `${issue}-${agency}-${index}`,
      issue,
      issueIcon: issueMeta.icon,
      issueLabel: issueMeta.label,
      issueType: issue,
      subject: letter.subject || `${AGENCIES[agency] || agency} dispute draft`,
      text: sanitizeText(letter.text, { maxLength: 11000, preserveNewlines: true }),
    }
  }).filter((letter) => Boolean(letter.text))
}

async function resolveOwnedUploads(fileIds, userId) {
  if (!fileIds.length) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('uploads')
    .select('*')
    .eq('user_id', userId)
    .in('id', fileIds)

  if (error) {
    throw new ApiError(500, 'Unable to verify uploaded files.', { expose: false })
  }

  if (!data || data.length !== fileIds.length) {
    throw new ApiError(403, 'One or more uploaded files could not be verified.')
  }

  const byId = new Map(data.map((file) => [file.id, file]))
  return fileIds.map((id) => byId.get(id))
}

function sendEvent(response, payload) {
  if (!response._ssePatched && response.socket?.setNoDelay) {
    try {
      response.socket.setNoDelay(true)
    } catch {
      /* ignore */
    }
    response._ssePatched = true
  }
  response.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function safeJsonParse(value) {
  try {
    return JSON.parse(stripCodeFences(value))
  } catch {
    return null
  }
}

function stripCodeFences(value) {
  return String(value || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
