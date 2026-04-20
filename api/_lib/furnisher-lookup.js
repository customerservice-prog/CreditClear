/**
 * Furnisher / collector / creditor address lookup. Backed by the
 * public.furnishers + public.furnisher_aliases tables seeded in
 * migration 20260430000100_furnishers_seed.sql.
 *
 * Pure normalization is exported separately so the unit tests don't
 * have to touch Supabase.
 */

/**
 * Lowercase + strip everything that isn't a-z0-9. This must match the
 * `alias_norm` shape stored in the seed migration so direct lookups hit
 * the index. We deliberately drop "the", "inc", "llc", "co", "company",
 * "bank", "credit", "card" so a casual user typing "Capital One Bank"
 * still hits the "capitalone" alias.
 */
const NOISE_TOKENS = ['the', 'inc', 'llc', 'co', 'company', 'corp', 'corporation']

export function normalizeFurnisherName(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return ''
  const stripped = trimmed
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !NOISE_TOKENS.includes(tok))
    .join('')
  return stripped
}

/**
 * Looks up a furnisher row by alias. Returns null if no match (the
 * caller should then render the [Furnisher mailing address] placeholder
 * so the user has to manually fill it in). Returns null without throwing
 * for any DB error so a failing lookup never blocks letter generation.
 */
export async function lookupFurnisherAddress(name) {
  const norm = normalizeFurnisherName(name)
  if (!norm || norm.length < 2) return null

  try {
    const { supabaseAdmin } = await import('./supabase-admin.js')
    const { data, error } = await supabaseAdmin.rpc('lookup_furnisher', { p_alias_norm: norm })
    if (error) return null
    if (!Array.isArray(data) || data.length === 0) return null
    const row = data[0]
    return {
      canonicalName: row.canonical_name,
      kind: row.kind,
      street: row.street,
      city: row.city,
      state: row.state,
      zip: row.zip,
      country: row.country,
      sourceUrl: row.source_url,
      lastVerifiedOn: row.last_verified_on,
    }
  } catch {
    return null
  }
}

/**
 * Renders a furnisher row as the address-block lines used in letter
 * templates. We always include the canonical name (overrides whatever
 * the user typed so misspellings get cleaned up automatically) plus a
 * "Consumer Disputes" attention line because most of these PO boxes
 * route there by default.
 */
export function renderFurnisherAddressLines(row) {
  if (!row) {
    return ['[Furnisher / Original Creditor name]', '[Furnisher mailing address — confirm at the company\'s consumer-disputes page]', '[City, State ZIP]']
  }
  return [row.canonicalName, 'Attn: Consumer Disputes', row.street, `${row.city}, ${row.state} ${row.zip}`]
}
