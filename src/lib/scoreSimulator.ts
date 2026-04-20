/**
 * Deterministic, educational credit-score signal simulator.
 *
 * IMPORTANT: This is NOT a FICO score and NOT a VantageScore. Both models are
 * proprietary and cannot be reproduced. What we do here is a transparent,
 * rule-based estimate of how the *signals* the bureaus look at would shift if
 * a set of accounts were removed from the report. Every weight and formula is
 * published in this file so the user can audit it.
 *
 * Inputs:  the user's parsed tradelines plus a set of tradeline ids the user
 *          is hypothetically disputing.
 * Outputs: utilization%, average age (months), derogatory account count,
 *          total balance — both before and after — plus a friendly, capped
 *          delta in arbitrary "signal points" using FICO's published category
 *          weights (35% payment history, 30% utilization, 15% age, 10% mix,
 *          10% new credit) as the rough relative importance.
 */

import type { TradelineRow } from '../types'

export interface ScoreSnapshot {
  /** Sum of revolving balances across all included tradelines, in cents. */
  totalBalanceCents: number
  /** Sum of revolving credit limits across all included tradelines, in cents. */
  totalCreditLimitCents: number
  /** Total balance / total limit, as a percentage 0..100. Null if no limits. */
  utilizationPercent: number | null
  /** Average opened-account age across all included tradelines, in months. */
  averageAgeMonths: number | null
  /** Count of accounts in serious delinquency / collection / charge-off. */
  derogatoryCount: number
  /** Total tradeline count after removals. */
  tradelineCount: number
}

export interface SimulationResult {
  before: ScoreSnapshot
  after: ScoreSnapshot
  /** Educational signal-points delta. Capped at -150..+150. */
  signalPointsDelta: number
  notes: string[]
}

const DEROGATORY_KEYWORDS = [
  'collection',
  'charge off',
  'charged off',
  'chargedoff',
  'charge-off',
  'late',
  'past due',
  'derogatory',
  'repossession',
  'repo',
  'foreclosure',
  'bankruptcy',
]

function isDerogatory(t: TradelineRow): boolean {
  const fields = [t.account_status, t.payment_status, t.worst_delinquency]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase())
  return fields.some((field) => DEROGATORY_KEYWORDS.some((kw) => field.includes(kw)))
}

function isRevolving(t: TradelineRow): boolean {
  const type = String(t.account_type || '').toLowerCase()
  return type.includes('revolving') || type.includes('credit card') || type.includes('line of credit')
}

function monthsBetween(fromIsoDate: string | null, today: Date): number | null {
  if (!fromIsoDate) return null
  const opened = new Date(`${fromIsoDate}T00:00:00Z`)
  if (Number.isNaN(opened.getTime())) return null
  const months =
    (today.getUTCFullYear() - opened.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - opened.getUTCMonth())
  return months > 0 ? months : 0
}

export function summarizeTradelines(tradelines: TradelineRow[], today: Date = new Date()): ScoreSnapshot {
  let totalBalanceCents = 0
  let totalCreditLimitCents = 0
  let derogatoryCount = 0
  let ageMonthsSum = 0
  let ageCount = 0

  for (const t of tradelines) {
    if (isRevolving(t)) {
      totalBalanceCents += Math.max(0, t.balance_cents || 0)
      totalCreditLimitCents += Math.max(0, t.credit_limit_cents || 0)
    }
    if (isDerogatory(t)) derogatoryCount += 1
    const months = monthsBetween(t.opened_on, today)
    if (months !== null) {
      ageMonthsSum += months
      ageCount += 1
    }
  }

  return {
    totalBalanceCents,
    totalCreditLimitCents,
    utilizationPercent:
      totalCreditLimitCents > 0
        ? Math.round((totalBalanceCents / totalCreditLimitCents) * 1000) / 10
        : null,
    averageAgeMonths: ageCount > 0 ? Math.round(ageMonthsSum / ageCount) : null,
    derogatoryCount,
    tradelineCount: tradelines.length,
  }
}

/**
 * Compares the "before" snapshot (full report) with the "after" snapshot
 * (report minus the removed tradelines) and produces an educational signal-
 * points delta. Weights mirror FICO's published category importance:
 *   payment history    35
 *   utilization        30
 *   length of history  15
 *   credit mix         10
 *   new credit         10
 *
 * To stay honest we cap the magnitude at ±150 points and we surface the
 * notes that drove each component so the user can see exactly why.
 */
export function simulate(
  allTradelines: TradelineRow[],
  removedTradelineIds: ReadonlySet<string>,
): SimulationResult {
  const today = new Date()
  const before = summarizeTradelines(allTradelines, today)
  const remaining = allTradelines.filter((t) => !removedTradelineIds.has(t.id))
  const after = summarizeTradelines(remaining, today)
  const removed = allTradelines.filter((t) => removedTradelineIds.has(t.id))

  const notes: string[] = []
  let delta = 0

  // Payment history: removing a derogatory tradeline is the single largest
  // potential signal change. Each derogatory removed is worth ~15 signal
  // points, capped at +90 (i.e. 6 derogatories).
  const derogatoryRemoved = removed.filter(isDerogatory).length
  if (derogatoryRemoved > 0) {
    const points = Math.min(90, derogatoryRemoved * 15)
    delta += points
    notes.push(
      `+${points} (payment history) — ${derogatoryRemoved} derogatory account${
        derogatoryRemoved === 1 ? '' : 's'
      } removed.`,
    )
  }

  // Utilization: each 10-point drop in utilization% is worth ~10 signal
  // points, capped at ±60.
  if (before.utilizationPercent !== null && after.utilizationPercent !== null) {
    const utilDeltaPct = before.utilizationPercent - after.utilizationPercent
    const utilPoints = Math.max(-60, Math.min(60, Math.round(utilDeltaPct)))
    if (utilPoints !== 0) {
      delta += utilPoints
      notes.push(
        `${utilPoints > 0 ? '+' : ''}${utilPoints} (utilization) — went from ${before.utilizationPercent}% to ${after.utilizationPercent}%.`,
      )
    }
  }

  // Length of history: removing accounts can drop average age. Each 12-month
  // average-age drop is ~5 signal points off, capped at ±30.
  if (before.averageAgeMonths !== null && after.averageAgeMonths !== null) {
    const ageDeltaMonths = after.averageAgeMonths - before.averageAgeMonths
    const agePoints = Math.max(-30, Math.min(30, Math.round((ageDeltaMonths / 12) * 5)))
    if (agePoints !== 0) {
      delta += agePoints
      notes.push(
        `${agePoints > 0 ? '+' : ''}${agePoints} (length of history) — average account age changed by ${ageDeltaMonths} months.`,
      )
    }
  }

  // Credit mix: dropping below 3 distinct account types loses ~5 points;
  // gaining a type adds +5. We approximate "type" via account_type buckets.
  const beforeTypes = new Set(allTradelines.map((t) => normalizeType(t.account_type)))
  const afterTypes = new Set(remaining.map((t) => normalizeType(t.account_type)))
  const mixDelta = afterTypes.size - beforeTypes.size
  if (mixDelta !== 0) {
    const mixPoints = Math.max(-15, Math.min(15, mixDelta * 5))
    delta += mixPoints
    notes.push(
      `${mixPoints > 0 ? '+' : ''}${mixPoints} (credit mix) — ${
        mixDelta > 0 ? 'gained' : 'lost'
      } ${Math.abs(mixDelta)} account type${Math.abs(mixDelta) === 1 ? '' : 's'}.`,
    )
  }

  delta = Math.max(-150, Math.min(150, delta))

  if (notes.length === 0) {
    notes.push('No measurable signal change for the items selected.')
  }
  notes.push(
    'Educational estimate only. FICO and VantageScore are proprietary; your real score depends on the bureaus, not on this calculator.',
  )

  return { before, after, signalPointsDelta: delta, notes }
}

function normalizeType(raw: string | null): string {
  const t = String(raw || '').toLowerCase()
  if (t.includes('revolving') || t.includes('credit card')) return 'revolving'
  if (t.includes('mortgage')) return 'mortgage'
  if (t.includes('auto')) return 'auto'
  if (t.includes('student')) return 'student'
  if (t.includes('installment') || t.includes('loan')) return 'installment'
  if (t.includes('collection')) return 'collection'
  return t || 'other'
}

export function formatMoneyCents(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return '$0'
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
