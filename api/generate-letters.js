import { applyCors } from './_lib/cors.js'
import { assertPremiumAccess, ensureAccountState } from './_lib/account.js'
import { extractTextFromBureauUploads } from './_lib/extract-report-text.js'
import { normalizeGenerationRequest } from './_lib/generation.js'
import { ApiError, sendError, toSseErrorMessage } from './_lib/http.js'
import { lookupFurnisherAddress, renderFurnisherAddressLines } from './_lib/furnisher-lookup.js'
import {
  LETTER_TYPE_META,
  buildConsolidatedBureauRoundLetter,
  buildLetterText,
  collectIssueLineItems,
  consolidatedBureauSubject,
  letterSubject,
} from './_lib/letter-templates.js'
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

const BUREAU_FACING_TYPES = new Set(['bureau_initial', 'mov', 'cfpb'])

/** Uploads explicitly labeled for this bureau or a combined tri-merge file. */
function uploadsForAgency(resolvedUploads, agency) {
  return resolvedUploads.filter((row) => {
    const tag = row.report_bureau
    return tag === 'combined' || tag === agency
  })
}

async function buildDraftPayloadJson(normalizedRequest, resolvedUploads, extractedByAgency) {
  void extractedByAgency
  const agencies = normalizedRequest.agencies?.length
    ? normalizedRequest.agencies
    : Object.keys(AGENCIES)
  const issues = normalizedRequest.issues?.length ? normalizedRequest.issues : Object.keys(ISSUES)
  const info = normalizedRequest.info || {}
  const issueDetails = normalizedRequest.issueDetails || {}
  const letterType = normalizedRequest.letterType || 'bureau_initial'
  const typeMeta = LETTER_TYPE_META[letterType] || LETTER_TYPE_META.bureau_initial
  const letterList = []

  const directRecipientTypes = new Set(['furnisher', 'validation', 'goodwill'])
  const furnisherCache = new Map()
  const directRecipientWanted = directRecipientTypes.has(letterType)

  if (BUREAU_FACING_TYPES.has(letterType)) {
    for (const agency of agencies) {
      const forBureau = uploadsForAgency(resolvedUploads, agency)
      if (forBureau.length === 0) {
        continue
      }
      const text = buildConsolidatedBureauRoundLetter({
        agency,
        info,
        issueCatalog: ISSUES,
        issueDetails,
        issues,
        type: letterType,
      })
      letterList.push({
        agency,
        issue: 'multi',
        subject: consolidatedBureauSubject({ agency, categoryCount: issues.length, type: letterType }),
        text,
      })
    }
  } else {
    for (const agency of agencies) {
      for (const issue of issues) {
        const issueMeta = ISSUES[issue] || { label: issue }
        const issueDetail = issueDetails[issue] || null

        let furnisherAddressLines
        if (directRecipientWanted) {
          const lines = collectIssueLineItems(issueDetail || {})
          const creditorName = lines[0]?.creditorName?.trim()
          if (creditorName) {
            if (!furnisherCache.has(creditorName)) {
              const row = await lookupFurnisherAddress(creditorName)
              furnisherCache.set(creditorName, row ? renderFurnisherAddressLines(row) : null)
            }
            furnisherAddressLines = furnisherCache.get(creditorName)
          }
        }

        const text = buildLetterText({
          type: letterType,
          agency,
          info,
          issueMeta,
          issueDetail,
          forBureau: [],
          furnisherAddressLines,
        })

        letterList.push({
          agency,
          issue,
          subject: letterSubject({ agency, issueMeta, type: letterType }),
          text,
        })
      }
    }
  }

  const summary = BUREAU_FACING_TYPES.has(letterType)
    ? `${typeMeta.label} (${typeMeta.citation}) — ${letterList.length} draft${letterList.length === 1 ? '' : 's'}: one letter per bureau with every disputed tradeline listed. Read before mailing.`
    : `${typeMeta.label} drafts (${typeMeta.citation}). Read every line carefully before mailing — accuracy is your responsibility. ${
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
    const mimes = rows.map((r) => String(r.mime_type || '').toLowerCase())
    const hasPdf = mimes.some((m) => m === 'application/pdf')
    const hasImage = mimes.some((m) => m.startsWith('image/'))
    const ex = extractedByAgency[agency] || {
      text: '',
      pdfFilesTried: 0,
      imageOcrTried: 0,
    }
    const empty = !String(ex.text || '').trim()
    if (hasPdf && ex.pdfFilesTried > 0 && empty) {
      hints.push(
        `Little or no text was read from your ${AGENCIES[agency] || agency} PDF (common with scanned/image PDFs). Download a text-selectable report from the bureau, re-upload, or fill the tradeline prompts in the letter manually.`,
      )
    }
    if (hasImage && ex.imageOcrTried > 0 && empty) {
      hints.push(
        `Little or no text was read from your ${AGENCIES[agency] || agency} screenshot or photo (try a clearer full-screen capture, or upload a text-based PDF). You can still fill tradeline prompts in the letter manually.`,
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

    if (BUREAU_FACING_TYPES.has(normalizedRequest.letterType)) {
      for (const agency of normalizedRequest.agencies) {
        if (uploadsForAgency(resolvedUploads, agency).length === 0) {
          throw new ApiError(
            422,
            `Label an upload as your ${AGENCIES[agency] || agency} report (or “Combined” if one file covers every bureau). Each bureau you selected must have a matching labeled file before generating.`,
            { expose: true },
          )
        }
      }
    }

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
      sendEvent(response, { type: 'status', message: `Reading ${label} report text (PDF or OCR)…` })
      extractedByAgency[agency] = await extractTextFromBureauUploads(supabaseAdmin, rows, extractionCache)
    }

    sendEvent(response, { type: 'status', message: 'Drafting dispute letters…' })

    const text = await buildDraftPayloadJson(normalizedRequest, resolvedUploads, extractedByAgency)

    const parsed = safeJsonParse(text)
    const letters = normalizeLetters(
      parsed?.letters || [],
      normalizedRequest.agencies,
      normalizedRequest.issues,
      normalizedRequest.letterType,
    )
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

function normalizeLetters(rawLetters, agencies, issues, letterType) {
  const bureauFacing = BUREAU_FACING_TYPES.has(letterType)
  const cap = bureauFacing ? rawLetters.length : Math.max(1, agencies.length * issues.length)

  return rawLetters.slice(0, cap).map((letter, index) => {
    const agency = agencies.includes(letter.agency) ? letter.agency : agencies[index % agencies.length] || 'equifax'
    const issueRaw = letter.issue
    const issue =
      issueRaw === 'multi'
        ? 'multi'
        : issues.includes(issueRaw)
          ? issueRaw
          : issues[index % issues.length] || 'late'
    const issueMeta =
      issue === 'multi'
        ? { icon: '📋', label: `All categories (${issues.length})` }
        : ISSUES[issue] || { icon: '📄', label: issue }

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
