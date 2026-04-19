import { getPublicEnv } from './publicEnv'

/**
 * True when the server has no external AI keys: letters use CreditClear’s built-in structured drafts.
 * Set in `/env.js` from the same rules as `api/generate-letters` stub mode.
 */
export function isOfflineDraftMode(): boolean {
  const v = getPublicEnv('VITE_OFFLINE_DRAFTS')
  return v === '1' || v === 'true'
}
