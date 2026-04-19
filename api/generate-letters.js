import { applyCors } from './_lib/cors.js'
import { assertPremiumAccess, ensureAccountState } from './_lib/account.js'
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

function uploadsForAgency(resolvedUploads, agency) {
  return resolvedUploads.filter((row) => {
    const tag = row.report_bureau
    return !tag || tag === 'combined' || tag === agency
  })
}

function buildDraftPayloadJson(normalizedRequest, resolvedUploads) {
  const agencies = normalizedRequest.agencies?.length
    ? normalizedRequest.agencies
    : Object.keys(AGENCIES)
  const issues = normalizedRequest.issues?.length ? normalizedRequest.issues : Object.keys(ISSUES)
  const info = normalizedRequest.info || {}
  const letterList = []

  for (const agency of agencies) {
    const forBureau = uploadsForAgency(resolvedUploads, agency)
    const bureauReportLines =
      forBureau.length > 0
        ? [
            `Uploaded files we are matching to this bureau (${AGENCIES[agency] || agency}): ${forBureau
              .map((u) => u.file_name)
              .join('; ')}.`,
            'Edit the dispute text to mirror account names, numbers, dates, and balances exactly as they appear on that bureau’s report.',
          ]
        : resolvedUploads.length > 0
          ? [
              `Uploaded files are labeled for other bureaus (or not labeled). For ${AGENCIES[agency] || agency}, use only the credit report file that belongs to this bureau, or relabel uploads in the app.`,
              '[Replace this paragraph with your specific accounts, dates, and balances exactly as shown on this bureau’s report.]',
            ]
          : [
              '[Replace this paragraph with your specific accounts, dates, and balances exactly as shown on your credit report for this bureau.]',
            ]

    for (const issue of issues) {
      const agencyName = AGENCIES[agency] || agency
      const issueMeta = ISSUES[issue] || { label: issue }
      const fullName = `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Consumer'
      letterList.push({
        agency,
        issue,
        subject: `${agencyName} — ${issueMeta.label}: dispute letter draft`,
        text: [
          fullName,
          [info.address, [info.city, info.state].filter(Boolean).join(', '), info.zip].filter(Boolean).join('\n') ||
            '',
          '',
          `${agencyName}`,
          'Consumer dispute correspondence',
          '',
          `Re: ${issueMeta.label}`,
          '',
          'Dear Sir or Madam,',
          '',
          ...bureauReportLines,
          '',
          `I am writing to dispute information on my credit report related to “${issueMeta.label}” as it appears with your bureau.`,
          '',
          'This draft follows a standard dispute letter format. Edit every line to match your situation before you mail or submit through an official dispute channel.',
          '',
          'Include copies of any supporting documents and keep a record of what you send.',
          '',
          'Sincerely,',
          fullName,
        ]
          .filter((line, i, arr) => !(line === '' && arr[i + 1] === ''))
          .join('\n'),
      })
    }
  }

  return JSON.stringify({
    recommendations: [
      'Review every paragraph before you send anything to a bureau.',
      'Label each uploaded credit report with the correct bureau (or Combined) so drafts reference the right file.',
      'Replace bracketed placeholders with account numbers, dates, and balances from your credit file.',
      'Keep a copy of your dispute package for your records.',
    ],
    letters: letterList,
    summary:
      'Your dispute letter drafts are ready. Each one matches a bureau and issue you selected — personalize the details using the labeled report for that bureau, then submit through each bureau’s official dispute process.',
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

    sendEvent(response, { type: 'status', message: 'Analyzing credit report details...' })

    sendEvent(response, { type: 'status', message: 'Drafting dispute letters...' })

    const text = buildDraftPayloadJson(normalizedRequest, resolvedUploads)

    const parsed = safeJsonParse(text)
    const letters = normalizeLetters(parsed?.letters || [], normalizedRequest.agencies, normalizedRequest.issues)
    const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : ''
    const recommendations = [
      ...(Array.isArray(parsed?.recommendations)
        ? parsed.recommendations.map((value) => String(value).trim()).filter(Boolean)
        : []),
      ...extraRecommendationsFromUploads(normalizedRequest, resolvedUploads),
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
      text: sanitizeText(letter.text, { maxLength: 8000, preserveNewlines: true }),
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
