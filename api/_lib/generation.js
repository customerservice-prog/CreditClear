import { ApiError } from './http.js'
import { LETTER_TYPES } from './letter-templates.js'
import {
  ALLOWED_AGENCIES,
  ALLOWED_ISSUES,
  MAX_UPLOAD_COUNT,
  assertEmail,
  assertEnumArray,
  assertUuid,
  sanitizeText,
} from './validation.js'

const BUREAU_FACING_LETTERS = new Set(['bureau_initial', 'mov', 'cfpb'])

const ISSUE_LABELS = {
  late: 'Late payments',
  coll: 'Collections',
  inq: 'Hard inquiries',
  id: 'Identity errors',
  dup: 'Duplicate accounts',
  bal: 'Wrong balances',
  bk: 'Bankruptcy',
  repo: 'Repossessions',
  jud: 'Judgments / liens',
  cl: 'Closed accounts',
  sl: 'Student loans',
  med: 'Medical debt',
}

export function hasPremiumAccess(subscription, now = Date.now()) {
  const hasTrial = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at).getTime() > now : false
  const hasSubscription = subscription?.status === 'active'
  const hasActiveTrial = subscription?.status === 'trialing' && hasTrial
  return hasActiveTrial || hasSubscription
}

export function normalizeGenerationRequest(body) {
  const agencies = assertEnumArray(body.agencies, ALLOWED_AGENCIES, 'Agencies', { min: 1, max: 3 })
  const issues = assertEnumArray(body.issues, ALLOWED_ISSUES, 'Issues', { min: 1, max: ALLOWED_ISSUES.length })
  const files = Array.isArray(body.files) ? body.files : []

  if (files.length > MAX_UPLOAD_COUNT) {
    throw new ApiError(400, `No more than ${MAX_UPLOAD_COUNT} uploads can be analyzed at once.`)
  }

  const fileIds = files.map((file, index) => {
    if (!file || typeof file !== 'object') {
      throw new ApiError(400, `Upload ${index + 1} is invalid.`)
    }

    return assertUuid(file.id, `Upload ${index + 1}`)
  })

  const info = body.info && typeof body.info === 'object' ? body.info : {}
  const firstName = sanitizeText(info.firstName, { maxLength: 80 })
  const lastName = sanitizeText(info.lastName, { maxLength: 80 })
  const email = info.email ? assertEmail(info.email) : ''

  if (!firstName || !lastName || !email) {
    throw new ApiError(400, 'Your personal information is incomplete.')
  }

  const address = sanitizeText(info.address, { maxLength: 160 })
  const city = sanitizeText(info.city, { maxLength: 80 })
  const state = sanitizeText(info.state, { maxLength: 40 })
  const zip = sanitizeText(info.zip, { maxLength: 16 })

  if (!address || !city || !state || !zip) {
    throw new ApiError(400, 'Street address, city, state, and ZIP are required on your dispute letters.')
  }

  const letterType = normalizeLetterType(body.letterType)
  const issueDetails = sanitizeIssueDetailsMap(body, issues)

  assertHasLetterSource(fileIds, issueDetails, issues, letterType)

  return {
    agencies,
    fileIds,
    letterType,
    info: {
      firstName,
      lastName,
      email,
      phone: sanitizeText(info.phone, { maxLength: 32 }),
      address,
      city,
      state,
      zip,
      dob: sanitizeText(info.dob, { maxLength: 20 }),
      ssn: sanitizeText(info.ssn, { maxLength: 4 }),
      includeDobInLetters: info.includeDobInLetters === true,
    },
    issueDetails,
    issues,
  }
}

/** Validate the optional letterType field. Defaults to bureau_initial. */
function normalizeLetterType(value) {
  if (value == null || value === '') return 'bureau_initial'
  const normalized = sanitizeText(value, { maxLength: 32 }).toLowerCase()
  if (!LETTER_TYPES.includes(normalized)) {
    throw new ApiError(400, 'Letter type is invalid.')
  }
  return normalized
}

function sanitizeIssueDetailItems(row) {
  const rawItems = row.items
  if (!Array.isArray(rawItems)) {
    return []
  }
  const out = []
  for (const it of rawItems.slice(0, 25)) {
    if (!it || typeof it !== 'object') {
      continue
    }
    const creditorName = sanitizeText(it.creditorName, { maxLength: 200 })
    if (!creditorName.trim()) {
      continue
    }
    out.push({
      accountLast4: sanitizeText(it.accountLast4, { maxLength: 32 }),
      amountOrBalance: sanitizeText(it.amountOrBalance, { maxLength: 80 }),
      creditorName,
      disputeReason: sanitizeText(it.disputeReason, { maxLength: 2000, preserveNewlines: true }),
      reportedDate: sanitizeText(it.reportedDate, { maxLength: 80 }),
    })
  }
  return out
}

function sanitizeIssueDetailsMap(body, issues) {
  const raw = body.issueDetails
  const out = {}
  if (!raw || typeof raw !== 'object') {
    return out
  }
  for (const issue of issues) {
    const row = raw[issue]
    if (!row || typeof row !== 'object') {
      continue
    }
    const items = sanitizeIssueDetailItems(row)
    out[issue] = {
      accountLast4: sanitizeText(row.accountLast4, { maxLength: 32 }),
      amountOrBalance: sanitizeText(row.amountOrBalance, { maxLength: 80 }),
      creditorName: sanitizeText(row.creditorName, { maxLength: 200 }),
      disputeReason: sanitizeText(row.disputeReason, { maxLength: 2000, preserveNewlines: true }),
      reportedDate: sanitizeText(row.reportedDate, { maxLength: 80 }),
      ...(items.length ? { items } : {}),
    }
  }
  return out
}

function hasTradelineForIssue(row) {
  if (!row) {
    return false
  }
  if (row.creditorName?.trim()) {
    return true
  }
  for (const it of row.items || []) {
    if (it?.creditorName?.trim()) {
      return true
    }
  }
  return false
}

function assertHasLetterSource(fileIds, issueDetails, issues, letterType) {
  if (BUREAU_FACING_LETTERS.has(letterType)) {
    if (!fileIds.length) {
      throw new ApiError(
        400,
        'Upload at least one credit report file (with the correct bureau label) before generating bureau dispute letters.',
      )
    }
    for (const issue of issues) {
      if (!hasTradelineForIssue(issueDetails[issue])) {
        const label = ISSUE_LABELS[issue] || issue
        throw new ApiError(
          400,
          `Each selected category needs at least one creditor/account. Add details for “${label}” or deselect that category.`,
        )
      }
    }
    return
  }

  if (fileIds.length > 0) {
    return
  }

  for (const issue of issues) {
    if (hasTradelineForIssue(issueDetails[issue])) {
      return
    }
  }

  throw new ApiError(
    400,
    'Upload at least one credit report file, or enter creditor / account details for at least one selected issue.',
  )
}
