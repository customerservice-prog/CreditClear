import { applyCors } from './_lib/cors.js'
import { assertPremiumAccess, ensureAccountState } from './_lib/account.js'
import { BUREAU_MAILING } from './_lib/bureauMail.js'
import { extractTextFromBureauUploads } from './_lib/extract-report-text.js'
import { normalizeGenerationRequest } from './_lib/generation.js'
import { ApiError, sendError, toSseErrorMessage } from './_lib/http.js'
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

/** Issue-specific legal hooks (not legal advice; user must verify). Each issue uses different emphasis. */
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

function letterDateFormatted() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function buildAccountSpecificParagraph(issueMeta, issueDetail) {
  if (!issueDetail?.creditorName?.trim()) {
    return ''
  }
  const bits = [
    `The account at issue concerns "${issueDetail.creditorName.trim()}" as reported on my file for the dispute category "${issueMeta.label}".`,
  ]
  if (issueDetail.accountLast4?.trim()) {
    bits.push(`Account reference (as reported / last digits): ${issueDetail.accountLast4.trim()}.`)
  }
  if (issueDetail.amountOrBalance?.trim()) {
    bits.push(`Balance or amount shown: ${issueDetail.amountOrBalance.trim()}.`)
  }
  if (issueDetail.reportedDate?.trim()) {
    bits.push(`Relevant date or status period: ${issueDetail.reportedDate.trim()}.`)
  }
  if (issueDetail.disputeReason?.trim()) {
    bits.push(`Summary of my position: ${issueDetail.disputeReason.trim()}`)
  }
  return bits.join(' ')
}

function uploadsForAgency(resolvedUploads, agency) {
  return resolvedUploads.filter((row) => {
    const tag = row.report_bureau
    return !tag || tag === 'combined' || tag === agency
  })
}

function buildLetterSections({
  agencyName,
  bureauMailLines,
  disputePara,
  extracted,
  forBureau,
  info,
  issueDetail,
  issueMeta,
}) {
  const fullName = `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Consumer'
  const street = (info.address || '').trim()
  const cityState = [info.city, info.state].filter(Boolean).join(', ').trim()
  const zip = (info.zip || '').trim()
  const cityLine = [cityState, zip].filter(Boolean).join(' ').trim()

  const bureauLines =
    bureauMailLines?.length > 0 ? bureauMailLines : [agencyName, 'Confirm the current mail-in dispute address on the bureau website.']

  const accountSpecific = buildAccountSpecificParagraph(issueMeta, issueDetail)
  // Note: raw PDF text is intentionally NOT pasted into letters anymore.
  // Bureaus reject letters that look like a wall of OCR'd report text. Structured
  // tradeline parsing lands in PR 3 and feeds buildAccountSpecificParagraph properly.
  void extracted

  /** @type {string[]} */
  const lines = [
    letterDateFormatted(),
    '',
    fullName,
    street,
    cityLine,
    '',
    info.phone?.trim() ? `Phone: ${info.phone.trim()}` : '',
    info.email?.trim() ? `Email: ${info.email.trim()}` : '',
    '',
    ...bureauLines,
    '',
    `Re: Fair Credit Reporting Act dispute — ${issueMeta.label}`,
    '',
    'Dear Sir or Madam,',
    '',
    'For verification of my identity (please match to my credit file):',
    `- Full name: ${fullName}`,
  ]

  if (info.dob?.trim()) {
    lines.push(`- Date of birth: ${info.dob.trim()}`)
  }
  if (info.ssn?.trim()) {
    lines.push(`- Social Security number (last four digits only): ${info.ssn.trim()}`)
  }
  lines.push(`- Current mailing address: ${[street, cityLine].filter(Boolean).join(', ')}`)
  lines.push('', 'I am requesting an investigation under 15 U.S.C. § 1681i.', '')

  if (forBureau.length > 0) {
    lines.push(
      `Attached or referenced materials include credit-report file(s) for review: ${forBureau.map((u) => u.file_name).join('; ')}.`,
      '',
    )
  }

  if (accountSpecific) {
    lines.push(accountSpecific, '')
  }

  lines.push(disputePara, '')

  if (!accountSpecific) {
    lines.push(
      `I dispute the accuracy or completeness of reported information for this category (${issueMeta.label}) on my ${agencyName} consumer report and request your reinvestigation.`,
      '',
    )
  }

  lines.push(
    'Please complete a reasonable reinvestigation under the Fair Credit Reporting Act. If any disputed item cannot be verified as accurate and complete, delete or correct it and provide me the results and an updated report disclosure as required by law.',
    '',
    'I have enclosed or attached copies of identifying documents as referenced above. I am keeping a copy of this dispute.',
    '',
    'Respectfully,',
    '',
    fullName,
    street,
    cityLine,
  )

  if (info.phone?.trim()) {
    lines.push(`Phone: ${info.phone.trim()}`)
  }
  if (info.email?.trim()) {
    lines.push(`Email: ${info.email.trim()}`)
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
  const issueDetails = normalizedRequest.issueDetails || {}
  const letterList = []

  for (const agency of agencies) {
    const forBureau = uploadsForAgency(resolvedUploads, agency)
    const extracted = extractedByAgency[agency] || { text: '', hadImageOnly: false, pdfFilesTried: 0 }
    const agencyName = AGENCIES[agency] || agency
    const bureauMailLines = BUREAU_MAILING[agency] || []

    for (const issue of issues) {
      const issueMeta = ISSUES[issue] || { label: issue }
      const issueDetail = issueDetails[issue] || null

      const disputePara =
        ISSUE_DISPUTE_PARAGRAPH[issue]?.(agencyName) || ISSUE_DISPUTE_PARAGRAPH.late(agencyName)

      const text = buildLetterSections({
        agencyName,
        bureauMailLines,
        disputePara,
        extracted,
        forBureau,
        info,
        issueDetail,
        issueMeta,
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
      'Read every line of each letter before mailing — accuracy is your responsibility.',
      'Upload the bureau\u2019s official PDF (not a photo) and label it for the right bureau so future drafts can cite specific tradelines.',
      'Keep proof of mailing through each bureau\u2019s official dispute channel (certified mail with return receipt is the standard).',
    ],
    letters: letterList,
    summary:
      'Letters are built from FCRA-aligned templates plus the account details you entered in the wizard. Tradeline-level parsing of uploaded reports is rolling out next; for now, fill in creditor and account details on the Accounts step for the most specific letters.',
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
