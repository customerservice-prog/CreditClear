import { applyCors } from './_lib/cors.js'
import { assertPremiumAccess, ensureAccountState } from './_lib/account.js'
import { getOptionalEnv, getRequiredEnv } from './_lib/env.js'
import { normalizeGenerationRequest } from './_lib/generation.js'
import { ApiError, sendError, toSseErrorMessage } from './_lib/http.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'
import {
  ALLOWED_AGENCIES,
  ALLOWED_ISSUES,
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
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
    const uploads = await resolveOwnedUploads(normalizedRequest.fileIds, authUser.id)

    response.setHeader('Content-Type', 'text/event-stream')
    response.setHeader('Cache-Control', 'no-cache, no-transform')
    response.setHeader('Connection', 'keep-alive')

    sendEvent(response, { type: 'status', message: 'Scanning uploaded materials...' })

    const content = [
      {
        type: 'text',
        text: buildUserPrompt({
          agencies: normalizedRequest.agencies,
          authUser,
          files: uploads,
          info: normalizedRequest.info,
          issues: normalizedRequest.issues,
        }),
      },
      ...(await buildAttachmentBlocks(uploads, authUser.id)),
    ]

    sendEvent(response, { type: 'status', message: 'Analyzing credit report details...' })

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': getOptionalEnv('AI_API_KEY', 'ANTHROPIC_API_KEY') || getRequiredEnv('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        max_tokens: 8192,
        model: getOptionalEnv('AI_MODEL_NAME') || 'claude-sonnet-4-20250514',
        system:
          'You are a careful consumer-finance document assistant. Generate factual, professional, user-reviewable dispute-draft content. Never promise outcomes, never claim guaranteed removals, never invent facts, never present legal advice, and never impersonate a law firm. Return only valid JSON with keys: summary, recommendations, letters. Each letter must contain: agency, issue, subject, text.',
        messages: [{ role: 'user', content }],
      }),
    })

    if (!anthropicResponse.ok) {
      throw new ApiError(502, 'The AI draft service is temporarily unavailable. Please try again shortly.', {
        expose: true,
      })
    }

    sendEvent(response, { type: 'status', message: 'Drafting dispute letters...' })

    const anthropicPayload = await anthropicResponse.json()
    const text = (anthropicPayload.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')

    const parsed = safeJsonParse(text)
    const letters = normalizeLetters(parsed?.letters || [], normalizedRequest.agencies, normalizedRequest.issues)
    const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : ''
    const recommendations = Array.isArray(parsed?.recommendations)
      ? parsed.recommendations.map((value) => String(value).trim()).filter(Boolean)
      : []

    if (!letters.length) {
      throw new ApiError(502, 'The AI response was empty or malformed. Please try again.', { expose: true })
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

function buildUserPrompt({ agencies, authUser, files, info, issues }) {
  const selectedAgencies = agencies.length ? agencies : Object.keys(AGENCIES)
  const selectedIssues = issues.length ? issues : Object.keys(ISSUES)

  return `
Generate a consumer-review workflow response for every selected agency and issue combination.

User profile:
- Full name: ${info.firstName || ''} ${info.lastName || ''}
- Email: ${info.email || authUser.email || ''}
- Phone: ${info.phone || ''}
- Address: ${info.address || ''}
- City: ${info.city || ''}
- State: ${info.state || ''}
- ZIP: ${info.zip || ''}
- DOB: ${info.dob || ''}
- SSN last 4: ${info.ssn || ''}

Selected agencies:
${selectedAgencies.map((agency) => `- ${agency}: ${AGENCIES[agency] || agency}`).join('\n')}

Selected issues:
${selectedIssues.map((issue) => `- ${issue}: ${ISSUES[issue]?.label || issue}`).join('\n')}

Uploaded files:
${files.length ? files.map((file) => `- ${file.file_name} (${file.mime_type}, ${file.file_size} bytes)`).join('\n') : '- None provided'}

Requirements:
- Produce one letter per agency x issue pair.
- Make each letter specific, formal, and credible.
- Reference the relevant facts from the uploaded report when possible.
- Include a professional header and closing.
- Mention FCRA/FDCPA or related compliance principles only when genuinely relevant.
- Avoid promising deletion, removal, success, or legal representation.
- If uploaded evidence is incomplete, say so briefly in the summary or recommendations rather than inventing facts.
- Return JSON only with:
{
  "summary": "plain language summary",
  "recommendations": ["review note 1", "review note 2"],
  "letters": [
    {
      "agency": "equifax",
      "issue": "late",
      "subject": "subject line",
      "text": "full letter text"
    }
  ]
}
`.trim()
}

async function buildAttachmentBlocks(files, userId) {
  const blocks = []
  const totalBytes = files.reduce((sum, file) => sum + Number(file.file_size || 0), 0)

  if (totalBytes > 20 * 1024 * 1024) {
    throw new ApiError(400, 'Reduce upload size before generating drafts.')
  }

  for (const file of files) {
    if (!file.file_path || !file.file_path.startsWith(`${userId}/`)) {
      throw new ApiError(403, 'One or more uploaded files could not be verified.')
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mime_type) || Number(file.file_size) > MAX_UPLOAD_BYTES) {
      throw new ApiError(400, 'One or more uploaded files are not allowed.')
    }

    const { data, error } = await supabaseAdmin.storage.from('private-uploads').download(file.file_path)
    if (error || !data) {
      throw new ApiError(400, 'One or more uploaded files could not be loaded.')
    }

    const buffer = Buffer.from(await data.arrayBuffer())
    const base64 = buffer.toString('base64')

    if (file.mime_type === 'application/pdf') {
      blocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        },
        title: file.file_name,
      })
      continue
    }

    if (String(file.mime_type).startsWith('image/')) {
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.mime_type,
          data: base64,
        },
      })
    }
  }

  return blocks
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
    .select('id, user_id, dispute_id, file_path, file_name, mime_type, file_size, created_at')
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
