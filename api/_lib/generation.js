import { ApiError } from './http.js'
import {
  ALLOWED_AGENCIES,
  ALLOWED_ISSUES,
  MAX_UPLOAD_COUNT,
  assertEmail,
  assertEnumArray,
  assertUuid,
  sanitizeText,
} from './validation.js'

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

  const issueDetails = sanitizeIssueDetailsMap(body, issues)

  assertHasLetterSource(fileIds, issueDetails, issues)

  return {
    agencies,
    fileIds,
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
    },
    issueDetails,
    issues,
  }
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
    out[issue] = {
      accountLast4: sanitizeText(row.accountLast4, { maxLength: 32 }),
      amountOrBalance: sanitizeText(row.amountOrBalance, { maxLength: 80 }),
      creditorName: sanitizeText(row.creditorName, { maxLength: 200 }),
      disputeReason: sanitizeText(row.disputeReason, { maxLength: 2000, preserveNewlines: true }),
      reportedDate: sanitizeText(row.reportedDate, { maxLength: 80 }),
    }
  }
  return out
}

function assertHasLetterSource(fileIds, issueDetails, issues) {
  if (fileIds.length > 0) {
    return
  }

  for (const issue of issues) {
    const row = issueDetails[issue]
    if (row?.creditorName?.trim()) {
      return
    }
  }

  throw new ApiError(
    400,
    'Upload at least one credit report PDF (Step 4), or enter the creditor / account details for at least one selected issue (Step 3), so dispute letters are not blank templates.',
  )
}
