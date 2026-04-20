import type { AppInfo, IssueAccountDetail, IssueDetailsMap, IssueId, LetterType } from '../types'

export function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value)
}

/** Per-field errors for Step 0 (required: first, last, email). */
export function getPersonalFieldErrors(info: AppInfo): Partial<Record<keyof AppInfo, string>> {
  const e: Partial<Record<keyof AppInfo, string>> = {}
  if (!info.firstName.trim()) {
    e.firstName = 'First name is required.'
  }
  if (!info.lastName.trim()) {
    e.lastName = 'Last name is required.'
  }
  if (!info.email.trim()) {
    e.email = 'Email is required.'
  } else if (!isValidEmail(info.email.trim())) {
    e.email = 'Please enter a valid email address.'
  }
  if (info.firstName.length > 80) {
    e.firstName = e.firstName || 'First name is too long (max 80 characters).'
  }
  if (info.lastName.length > 80) {
    e.lastName = e.lastName || 'Last name is too long (max 80 characters).'
  }
  if (info.address.length > 160) {
    e.address = 'Address is too long.'
  }
  if (info.ssn && !/^\d{4}$/.test(info.ssn)) {
    e.ssn = 'Last four of SSN must be exactly 4 digits.'
  }
  return e
}

export function validateAppInfo(info: AppInfo) {
  const fieldErrors = getPersonalFieldErrors(info)
  if (Object.keys(fieldErrors).length > 0) {
    return 'Please complete your required personal information.'
  }

  return null
}

/** Call before generating letters — matches server /api generation rules. */
export function validateMailingAddressForLetters(info: AppInfo) {
  if (!info.address.trim() || !info.city.trim() || !info.state.trim() || !info.zip.trim()) {
    return 'Enter your full mailing address (street, city, state, ZIP) on Step 1 — bureaus need it on dispute letters.'
  }
  return null
}

export function issueHasTradelineDetail(detail: IssueAccountDetail | undefined): boolean {
  if (!detail) {
    return false
  }
  if (detail.creditorName?.trim()) {
    return true
  }
  return Boolean(detail.items?.some((row) => row.creditorName?.trim()))
}

/** Call before generating — mirrors server rules for bureau vs furnisher letter types. */
export function hasLetterGenerationSource(
  files: { id?: string }[],
  issues: IssueId[],
  issueDetails: IssueDetailsMap,
  letterType: LetterType = 'bureau_initial',
) {
  const bureauFacing = letterType === 'bureau_initial' || letterType === 'mov' || letterType === 'cfpb'

  if (bureauFacing) {
    if (!files.some((f) => Boolean(f.id))) {
      return false
    }
    for (const issue of issues) {
      if (!issueHasTradelineDetail(issueDetails[issue])) {
        return false
      }
    }
    return true
  }

  if (files.some((f) => Boolean(f.id))) {
    return true
  }
  for (const issue of issues) {
    if (issueHasTradelineDetail(issueDetails[issue])) {
      return true
    }
  }
  return false
}

export function validateUpload(file: File, maxBytes = 10 * 1024 * 1024) {
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']

  if (!allowed.includes(file.type)) {
    return 'Only PDF, PNG, JPG, WEBP, and HEIC files are supported.'
  }

  if (file.size > maxBytes) {
    return 'Please upload files smaller than 10 MB.'
  }

  return null
}

/** True for phone screenshots / exports saved as PNG, JPEG, WebP, HEIC, etc. */
export function isImageUploadMime(mime: string | undefined | null): boolean {
  return String(mime || '')
    .toLowerCase()
    .startsWith('image/')
}

export function sanitizeUploadFileName(name: string) {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/\.\.+/g, '.')
      .slice(0, 80) || 'upload'
  )
}

export function buildSafeUploadPath(userId: string, fileName: string) {
  const safeName = sanitizeUploadFileName(fileName)
  const random = Math.random().toString(36).slice(2, 10)
  return `${userId}/${Date.now()}-${random}-${safeName}`
}

export function sanitizeEditableLetterText(value: string, maxLength = 12000) {
  return value.split('\0').join('').slice(0, maxLength)
}
