/**
 * Stub certified-mail provider. Returns deterministic, realistic-looking
 * tracking numbers and postage costs so the entire mailings pipeline
 * (endpoint -> DB row -> dispute detail UI) can be exercised without a
 * Lob / USPS / Stannp account.
 *
 * Drop-in replacement: implement `mailLetter({ ...args })` against the real
 * provider SDK. As long as it returns the same shape (trackingNumber,
 * postageCents, mailedAt, providerPayload), the rest of the pipeline does
 * not change.
 */

import { BUREAU_MAILING } from './bureauMail.js'

/** Toggle real mail sends from the environment without a redeploy. */
export function isMailEnabled() {
  const raw = (process.env.MAIL_ENABLED || '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

const SUPPORTED_BUREAUS = /** @type {const} */ (['equifax', 'experian', 'transunion'])

/**
 * USPS Certified Mail with Return Receipt is roughly $4.45 + $3.65 + $0.73
 * (first-class) = ~$8.83 in 2026. We use a fixed stub price so demos /
 * snapshots are stable; the real provider will return a precise quote.
 */
const STUB_POSTAGE_CENTS = 883

/**
 * Builds a USPS-style 22-digit certified-mail tracking number. Real USPS
 * tracking starts with 9407 (Certified Mail Restricted Delivery).
 */
function buildStubTrackingNumber(seed) {
  const base = '9407'
  const tail = String(seed).padStart(18, '0').slice(-18)
  return `${base}${tail}`
}

/**
 * @param {object} args
 * @param {'equifax'|'experian'|'transunion'} args.bureau
 * @param {string} args.letterId  uuid of the letter being mailed
 * @param {string} args.letterText  rendered letter body for archival
 * @param {{ name: string; address?: string; city?: string; state?: string; zip?: string }} args.sender
 * @returns {{ trackingNumber: string; postageCents: number; mailedAt: string; recipient: { name: string; address: string[] }; providerPayload: Record<string, unknown> }}
 */
export function mailLetter({ bureau, letterId, letterText, sender }) {
  if (!SUPPORTED_BUREAUS.includes(bureau)) {
    throw new Error(`Unsupported bureau for mail: ${bureau}`)
  }
  const recipient = BUREAU_MAILING[bureau] || []
  const recipientName = recipient[0] || ''
  const trackingNumber = buildStubTrackingNumber(
    Number.parseInt(String(letterId).replace(/[^0-9]/g, '').slice(0, 8) || '0', 10) ||
      Math.floor(Date.now() / 1000),
  )

  return {
    trackingNumber,
    postageCents: STUB_POSTAGE_CENTS,
    mailedAt: new Date().toISOString(),
    recipient: {
      name: recipientName,
      address: recipient,
    },
    providerPayload: {
      provider: 'stub',
      letterLength: typeof letterText === 'string' ? letterText.length : 0,
      sender: sender || null,
      service: 'certified-mail-rrr',
    },
  }
}

export const MAIL_BUREAUS = SUPPORTED_BUREAUS
export const MAIL_STUB_POSTAGE_CENTS = STUB_POSTAGE_CENTS
