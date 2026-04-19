import { applyCors } from './_lib/cors.js'
import { assertPremiumAccess, ensureAccountState } from './_lib/account.js'
import { extractTextFromBureauUploads } from './_lib/extract-report-text.js'
import { normalizeGenerationRequest } from './_lib/generation.js'
import { ApiError, sendError, toSseErrorMessage } from './_lib/http.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'
import {
  ALLOWED_AGENCIES,
  ALLOWED_ISSUES,
  sanitizeText,
} from './_lib/validation.js'

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

/** Issue-specific FCRA-oriented dispute language (not legal advice; user must verify). */
const ISSUE_DISPUTE_PARAGRAPH = {
  late: (agencyName) =>
    `Under the Fair Credit Reporting Act (FCRA), I am disputing reported late payment history on my ${agencyName} file for the account(s) identified above. If any late-payment notation cannot be fully verified as accurate, complete, or belonging to this account, I request that you delete or correct it after a reasonable reinvestigation and provide me with an updated copy of my credit file.`,
  coll: (agencyName) =>
    `Under the FCRA, I dispute the accuracy and/or completeness of the collection account information reported on my ${agencyName} credit file as described above. If all aspects cannot be verified with the furnisher, I request deletion or correction and an updated disclosure.`,
  inq: (agencyName) =>
    `I am disputing one or more hard inquiries listed on my ${agencyName} file as referenced above. If any inquiry was not authorized by me or is otherwise reported incorrectly, I request deletion after reinvestigation.`,
  id: (agencyName) =>
    `I am disputing identity-related information on my ${agencyName} report (names, addresses, Social Security details, or merged files) as outlined above. I request a thorough reinvestigation and correction of any inaccurate or mixed file data.`,
  dup: (agencyName) =>
    `I dispute duplicate tradelines or repeated accounts shown on my ${agencyName} file. If the same obligation appears more than once in error, I request consolidation or removal of the duplicate reporting after verification.`,
  bal: (agencyName) =>
    `I dispute balance and credit limit information reported on my ${agencyName} file as identified above. I request reinvestigation and correction where balances, limits, or utilization cannot be verified as accurate.`,
  bk: (agencyName) =>
    `I dispute bankruptcy-related public record or tradeline information on my ${agencyName} file as described above. I request verification and correction of any detail that is incorrect, obsolete, or cannot be confirmed.`,
  repo: (agencyName) =>
    `I dispute the reporting of repossession or voluntary surrender information on my ${agencyName} file for the account(s) above. I request reinvestigation and correction if any detail is inaccurate or unverifiable.`,
  jud: (agencyName) =>
    `I dispute judgment, lien, or similar public record information on my ${agencyName} file. I request reinvestigation and correction if any filing amount, date, or status is reported incorrectly or cannot be verified.`,
  cl: (agencyName) =>
    `I dispute how closed account(s) are reported on my ${agencyName} file (e.g., closed status, payment history, or pay-off information). I request correction or removal of any information that cannot be verified as accurate and complete.`,
  sl: (agencyName) =>
    `I dispute student loan tradeline(s) as reported on my ${agencyName} file (balances, status, or duplicate servicer lines). I request reinvestigation and correction after verification with the furnisher.`,
  med: (agencyName) =>
    `I dispute medical debt reporting on my ${agencyName} file as identified above, including whether amounts, dates, and collection status are reported correctly and consistently with applicable rules. I request correction or deletion of unverifiable items.`,
}

function manualAccountPromptLines(agencyName) {
  return [
    `DETAILED TRADELINE INFORMATION — copy from your official ${agencyName} credit report (paper or PDF):`,
    '• Creditor / subscriber name as shown: ________________________________________________',
    '• Account number (full or last digits as shown): ________________________________________________',
    '• Date opened / reported / status date (if shown): ________________________________________________',
    '• Balance, credit limit, or high balance shown: ________________________________________________',
    '• Payment history summary (e.g. 30/60/90-day late — note exact months/years shown): ________________________________________________',
    '• Briefly explain what is wrong, incomplete, or what you believe is unverifiable: ________________________________________________',
    '',
  ]
}

function uploadsForAgency(resolvedUploads, agency) {
  return resolvedUploads.filter((row) => {
    const tag = row.report_bureau
    return !tag || tag === 'combined' || tag === agency
  })
}

function buildLetterSections({
  agency,
  agencyName,
  issue,
  issueMeta,
  info,
  forBureau,
  resolvedUploads,
  extracted,
}) {
  const fullName = `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Consumer'
  const addrLine = [info.address, [info.city, info.state].filter(Boolean).join(', '), info.zip]
    .filter(Boolean)
    .join('\n')
  const anyUploads = resolvedUploads.length > 0
  const disputePara = ISSUE_DISPUTE_PARAGRAPH[issue]?.(agencyName) || ISSUE_DISPUTE_PARAGRAPH.late(agencyName)

  /** @type {string[]} */
  const lines = [
    fullName,
    addrLine,
    '',
    agencyName,
    'Consumer dispute correspondence',
    '',
    `Re: Dispute — ${issueMeta.label}`,
    '',
    'Dear Sir or Madam,',
    '',
  ]

  if (forBureau.length > 0) {
    lines.push(
      `The following uploaded file(s) are intended to correspond to my ${agencyName} credit report: ${forBureau.map((u) => u.file_name).join('; ')}.`,
      '',
    )
  } else if (anyUploads) {
    lines.push(
      `I have uploaded credit report file(s) in this session, but none are labeled for ${agencyName} in CreditClear. Please use only data from my official ${agencyName} report; consider relabeling files in the app or uploading the correct ${agencyName} PDF, then regenerating this draft for fuller automation.`,
      '',
    )
  } else {
    lines.push(
      `No credit report file was uploaded for this session. The numbered prompts below must be completed using your official ${agencyName} report (download from ${agencyName} or your tri-merge source).`,
      '',
    )
  }

  if (extracted.text?.trim()) {
    lines.push(
      'TEXT EXTRACTED FROM YOUR UPLOADED PDF(S) FOR THIS BUREAU (machine-read; verify every character against your own copy before mailing or filing):',
      '',
      extracted.text,
      '',
      'Using the excerpt above as reference, identify each tradeline you dispute. I have summarized my position in the following paragraph:',
      '',
      disputePara,
      '',
    )
  } else {
    if (extracted.hadImageOnly && extracted.pdfFilesTried === 0 && forBureau.length > 0) {
      lines.push(
        'Your upload appears to be an image or screenshot. CreditClear reads text from bureau PDF downloads automatically. For best results, upload the official PDF from the bureau website, then regenerate; or complete the prompts below manually from your report printout.',
        '',
      )
    }
    lines.push(disputePara, '')
    if (!extracted.text?.trim()) {
      lines.push(...manualAccountPromptLines(agencyName))
    }
  }

  lines.push(
    'Please complete a reasonable reinvestigation under the FCRA. If any disputed information cannot be verified as accurate, please delete or correct it and mail or deliver to me an updated copy of my credit file.',
    '',
    'Please find enclosed/attached copies of identifying information and any supporting documentation. I am keeping a copy of this dispute for my records.',
    '',
    'Sincerely,',
    fullName,
  )
  if (info.email) {
    lines.push(`Email: ${info.email}`)
  }
  if (info.phone) {
    lines.push(`Phone: ${info.phone}`)
  }

  return lines
    .filter((line, i, arr) => !(line === '' && arr[i + 1] === ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

function buildDraftPayloadJson(normalizedRequest, resolvedUploads, extractedByAgency) {
  const agencies = normalizedRequest.agencies?.length
    ? normalizedRequest.agencies
    : Object.keys(AGENCIES)
  const issues = normalizedRequest.issues?.length ? normalizedRequest.issues : Object.keys(ISSUES)
  const info = normalizedRequest.info || {}
  const letterList = []

  for (const agency of agencies) {
    const forBureau = uploadsForAgency(resolvedUploads, agency)
    const extracted = extractedByAgency[agency] || { text: '', hadImageOnly: false, pdfFilesTried: 0 }
    const agencyName = AGENCIES[agency] || agency

    for (const issue of issues) {
      const issueMeta = ISSUES[issue] || { label: issue }
      const text = buildLetterSections({
        agency,
        agencyName,
        extracted,
        forBureau,
        info,
        issue,
        issueMeta,
        resolvedUploads,
      })

      letterList.push({
        agency,
        issue,
        subject: `${agencyName} — ${issueMeta.label}: dispute letter draft`,
        text,
      })
    }
  }

  return JSON.stringify({
    recommendations: [
      'Read the entire letter and every line extracted from your PDF; automated text can miss columns or mix pages.',
      'Upload the bureau’s official PDF (not only a photo) for this bureau, label it correctly, and regenerate for the fullest draft.',
      'Keep proof of mailing or filing through each bureau’s official dispute channel.',
    ],
    letters: letterList,
    summary:
      'Draft letters now include stronger FCRA-style dispute language plus, when possible, text read from your uploaded PDF. Verify all details against your real credit report before sending.',
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
    .select('id, user_id, dispute_id, file_path, file_name, mime_type, file_size, report_bureau, created_at')
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
