import { describe, expect, it } from 'vitest'
import {
  buildSafeUploadPath,
  isImageUploadMime,
  sanitizeEditableLetterText,
  sanitizeUploadFileName,
} from './validators'

describe('upload path helpers', () => {
  it('sanitizes risky file names', () => {
    expect(sanitizeUploadFileName('../evil<script>.pdf')).toBe('.-evil-script-.pdf')
  })

  it('keeps generated upload paths inside the user prefix', () => {
    const path = buildSafeUploadPath('user-123', '../unsafe name.pdf')
    expect(path.startsWith('user-123/')).toBe(true)
    expect(path.includes('..')).toBe(false)
    expect(path.includes(' ')).toBe(false)
  })
})

describe('isImageUploadMime', () => {
  it('detects common image MIME types', () => {
    expect(isImageUploadMime('image/png')).toBe(true)
    expect(isImageUploadMime('image/jpeg')).toBe(true)
    expect(isImageUploadMime('IMAGE/WEBP')).toBe(true)
    expect(isImageUploadMime('application/pdf')).toBe(false)
    expect(isImageUploadMime('')).toBe(false)
  })
})

describe('letter sanitization', () => {
  it('removes null bytes and enforces max length', () => {
    const value = `hello\u0000${'x'.repeat(13000)}`
    const sanitized = sanitizeEditableLetterText(value)
    expect(sanitized.includes('\u0000')).toBe(false)
    expect(sanitized.length).toBe(12000)
  })
})
