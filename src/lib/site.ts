/** Canonical public site URL (no trailing slash). Used for OG tags, JSON-LD, and meta. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://www.creditclearai.com'
).replace(/\/$/, '')

/** Primary trial CTA — use everywhere a signup/trial button appears. */
export const CTA_TRIAL_LABEL = 'Start Free 7-Day Trial'
