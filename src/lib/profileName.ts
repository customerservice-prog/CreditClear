import type { SavedContact } from '../types'

/** True when `name` is only the mailbox local-part of `email` (bad OAuth / metadata). */
export function nameLooksLikeEmailLocalPart(name: string | undefined, email: string | undefined): boolean {
  const n = name?.trim().toLowerCase()
  const local = email?.split('@')[0]?.trim().toLowerCase()
  if (!n || !local) {
    return false
  }
  return n === local
}

/** Reject email-shaped strings and local-part–only “names” so we never pre-fill First Name from email. */
export function isUsableFullName(value: string | null | undefined, accountEmail: string | null | undefined): boolean {
  const t = String(value ?? '').trim()
  if (!t) {
    return false
  }
  if (t.includes('@') || /\S+@\S+\.\S+/.test(t)) {
    return false
  }
  if (nameLooksLikeEmailLocalPart(t, accountEmail ?? undefined)) {
    return false
  }
  return true
}

/**
 * Derive first/last only from profile full name or saved_contact — never from email local-part.
 * Pass `accountEmail` so we can ignore metadata that duplicates the mailbox prefix.
 */
export function splitProfileFirstLast(
  fullNameFromProfile: string | null | undefined,
  saved?: SavedContact | null,
  accountEmail?: string | null,
): { firstName: string; lastName: string } {
  const sFirst = saved?.firstName?.trim() ?? ''
  const sLast = saved?.lastName?.trim() ?? ''
  if (sFirst || sLast) {
    return { firstName: sFirst, lastName: sLast }
  }

  const trimmed = String(fullNameFromProfile ?? '').trim()
  if (!trimmed || !isUsableFullName(trimmed, accountEmail ?? null)) {
    return { firstName: '', lastName: '' }
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') ?? '',
  }
}
