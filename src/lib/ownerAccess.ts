import { getPublicEnv } from './publicEnv'

/** Same logic as server `api/_lib/account.js` — complimentary access for ops accounts. */
export function emailHasOwnerComplimentaryAccess(email: string | null | undefined): boolean {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) {
    return false
  }
  return getOwnerComplimentaryEmailSet().has(normalized)
}

function getOwnerComplimentaryEmailSet(): Set<string> {
  const set = new Set<string>()
  const addCsv = (raw: string | undefined) => {
    for (const part of String(raw || '').split(',')) {
      const t = part.trim().toLowerCase()
      if (t) {
        set.add(t)
      }
    }
  }
  addCsv(getPublicEnv('OWNER_FREE_ACCESS_EMAILS'))
  addCsv(getPublicEnv('ADMIN_EMAIL'))
  addCsv(getPublicEnv('VITE_OWNER_FREE_ACCESS_EMAILS'))
  return set
}
