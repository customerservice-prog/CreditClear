import type { AppInfo } from '../types'

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
