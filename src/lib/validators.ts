import type { AppInfo } from '../types'

export function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value)
}

export function validateAppInfo(info: AppInfo) {
  if (!info.firstName.trim() || !info.lastName.trim() || !info.email.trim()) {
    return 'Please complete your required personal information.'
  }

  if (!isValidEmail(info.email.trim())) {
    return 'Please enter a valid email address.'
  }

  if (info.firstName.length > 80 || info.lastName.length > 80 || info.address.length > 160) {
    return 'One or more fields are too long.'
  }

  if (info.ssn && !/^\d{4}$/.test(info.ssn)) {
    return 'Last four of SSN must be exactly 4 digits.'
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
