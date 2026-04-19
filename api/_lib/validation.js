import { ApiError } from './http.js'

export const ALLOWED_AGENCIES = ['equifax', 'experian', 'transunion']
export const ALLOWED_ISSUES = ['late', 'coll', 'inq', 'id', 'dup', 'bal', 'bk', 'repo', 'jud', 'cl', 'sl', 'med']
export const ALLOWED_UPLOAD_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_UPLOAD_COUNT = 6

const REPORT_BUREAU_LABELS = ['equifax', 'experian', 'transunion', 'combined']

export function assertOptionalReportBureau(value) {
  if (value == null || value === '') {
    return null
  }
  const normalized = sanitizeText(value, { maxLength: 24 }).toLowerCase()
  if (!REPORT_BUREAU_LABELS.includes(normalized)) {
    throw new ApiError(400, 'Report bureau label is invalid.')
  }
  return normalized
}

export function sanitizeText(value, { maxLength = 160, preserveNewlines = false } = {}) {
  const normalized = String(value ?? '')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ')
    .replace(/```/g, '')
    .replace(/<\/?(system|assistant|developer|tool)>/gi, ' ')
    .replace(/\b(ignore|disregard)\b.{0,40}\b(previous|above)\s+instructions\b/gi, ' ')
    .replace(/\b(system prompt|developer message|assistant message)\b/gi, ' ')

  const compact = preserveNewlines
    ? normalized.replace(/[^\S\r\n]+/g, ' ').trim()
    : normalized.replace(/\s+/g, ' ').trim()

  return compact.slice(0, maxLength)
}

export function sanitizeFileName(value) {
  const safe = sanitizeText(value, { maxLength: 120 })
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\.\.+/g, '.')
    .replace(/\s+/g, '-')

  return safe || 'upload'
}

export function assertNonEmptyString(value, field, { maxLength = 160 } = {}) {
  const sanitized = sanitizeText(value, { maxLength })
  if (!sanitized) {
    throw new ApiError(400, `${field} is required.`)
  }
  return sanitized
}

export function assertEmail(value, field = 'Email address') {
  const sanitized = assertNonEmptyString(value, field, { maxLength: 160 }).toLowerCase()
  if (!/\S+@\S+\.\S+/.test(sanitized)) {
    throw new ApiError(400, `${field} is invalid.`)
  }
  return sanitized
}

export function assertUuid(value, field) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, `${field} is invalid.`)
  }
  return value
}

export function assertOptionalUuid(value, field) {
  if (value == null || value === '') {
    return null
  }
  return assertUuid(value, field)
}

export function assertEnumArray(values, allowed, field, { min = 1, max = allowed.length } = {}) {
  if (!Array.isArray(values)) {
    throw new ApiError(400, `${field} must be an array.`)
  }

  const sanitized = [...new Set(values.map((value) => sanitizeText(value, { maxLength: 40 }).toLowerCase()).filter(Boolean))]

  if (sanitized.length < min || sanitized.length > max) {
    throw new ApiError(400, `${field} must include between ${min} and ${max} values.`)
  }

  if (sanitized.some((value) => !allowed.includes(value))) {
    throw new ApiError(400, `${field} contains an invalid value.`)
  }

  return sanitized
}

export function assertUploadMetadata({ disputeId, fileName, filePath, fileSize, mimeType, reportBureau, userId }) {
  const normalizedDisputeId = assertOptionalUuid(disputeId, 'Dispute id')
  const normalizedFileName = sanitizeFileName(assertNonEmptyString(fileName, 'File name', { maxLength: 120 }))
  const normalizedMimeType = sanitizeText(mimeType, { maxLength: 40 }).toLowerCase()
  const normalizedFilePath = assertNonEmptyString(filePath, 'File path', { maxLength: 240 })
  const normalizedReportBureau = assertOptionalReportBureau(reportBureau)

  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(normalizedMimeType)) {
    throw new ApiError(400, 'Unsupported file type.')
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) {
    throw new ApiError(400, 'File size is invalid.')
  }

  if (!normalizedFilePath.startsWith(`${userId}/`)) {
    throw new ApiError(403, 'Upload path is not allowed.')
  }

  return {
    disputeId: normalizedDisputeId,
    fileName: normalizedFileName,
    filePath: normalizedFilePath,
    fileSize,
    mimeType: normalizedMimeType,
    reportBureau: normalizedReportBureau,
  }
}
