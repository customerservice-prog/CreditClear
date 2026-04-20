import { describe, expect, it } from 'vitest'
import { simulate, summarizeTradelines } from './scoreSimulator'
import type { TradelineRow } from '../types'

const FIXED_TODAY = new Date('2026-04-01T00:00:00Z')

function tradeline(overrides: Partial<TradelineRow>): TradelineRow {
  return {
    id: 't_default',
    report_id: 'r_1',
    user_id: 'u_1',
    creditor: 'Test',
    account_last4: '0000',
    account_type: 'Revolving',
    account_status: 'Open',
    payment_status: 'Pays as agreed',
    worst_delinquency: null,
    balance_cents: 0,
    high_balance_cents: 0,
    credit_limit_cents: 0,
    past_due_cents: 0,
    monthly_payment_cents: 0,
    opened_on: '2020-01-01',
    reported_on: '2026-01-01',
    closed_on: null,
    payment_history: [],
    raw: {},
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('summarizeTradelines', () => {
  it('returns null utilization when no revolving limits', () => {
    const summary = summarizeTradelines(
      [tradeline({ id: 't1', account_type: 'Auto loan', balance_cents: 100, credit_limit_cents: 0 })],
      FIXED_TODAY,
    )
    expect(summary.utilizationPercent).toBeNull()
  })

  it('computes utilization across revolving accounts only', () => {
    const summary = summarizeTradelines(
      [
        tradeline({ id: 't1', balance_cents: 100_00, credit_limit_cents: 500_00 }),
        tradeline({ id: 't2', balance_cents: 100_00, credit_limit_cents: 500_00 }),
        tradeline({ id: 't3', account_type: 'Auto loan', balance_cents: 1_000_00, credit_limit_cents: 0 }),
      ],
      FIXED_TODAY,
    )
    expect(summary.utilizationPercent).toBe(20)
  })

  it('flags collection / late / charge-off as derogatory', () => {
    const summary = summarizeTradelines(
      [
        tradeline({ id: 't1', payment_status: 'Pays as agreed' }),
        tradeline({ id: 't2', payment_status: '120 days past due' }),
        tradeline({ id: 't3', account_type: 'Collection', payment_status: 'Collection account' }),
      ],
      FIXED_TODAY,
    )
    expect(summary.derogatoryCount).toBe(2)
  })

  it('computes average age in months', () => {
    const summary = summarizeTradelines(
      [
        tradeline({ id: 't1', opened_on: '2020-04-01' }),
        tradeline({ id: 't2', opened_on: '2024-04-01' }),
      ],
      FIXED_TODAY,
    )
    expect(summary.averageAgeMonths).toBe(48)
  })
})

describe('simulate', () => {
  it('returns no-op note when nothing is removed', () => {
    const result = simulate([tradeline({ id: 't1' })], new Set())
    expect(result.signalPointsDelta).toBe(0)
    expect(result.notes.some((n) => /No measurable signal change/i.test(n))).toBe(true)
  })

  it('rewards removing a derogatory account', () => {
    const lines: TradelineRow[] = [
      tradeline({ id: 't1', balance_cents: 100, credit_limit_cents: 1000 }),
      tradeline({ id: 't2', payment_status: 'Collection account' }),
    ]
    const result = simulate(lines, new Set(['t2']))
    expect(result.signalPointsDelta).toBeGreaterThan(0)
    expect(result.notes.join(' ')).toMatch(/payment history/i)
  })

  it('rewards utilization drop', () => {
    const lines: TradelineRow[] = [
      tradeline({ id: 't1', balance_cents: 90_00, credit_limit_cents: 100_00 }),
      tradeline({ id: 't2', balance_cents: 0, credit_limit_cents: 100_00 }),
    ]
    const result = simulate(lines, new Set(['t1']))
    expect(result.before.utilizationPercent).toBe(45)
    expect(result.after.utilizationPercent).toBe(0)
    expect(result.signalPointsDelta).toBeGreaterThan(0)
    expect(result.notes.join(' ')).toMatch(/utilization/i)
  })

  it('caps the delta at 150 in absolute value', () => {
    const lines: TradelineRow[] = []
    for (let i = 0; i < 30; i += 1) {
      lines.push(tradeline({ id: `derog_${i}`, payment_status: 'Charge off' }))
    }
    const removed = new Set(lines.map((l) => l.id))
    const result = simulate(lines, removed)
    expect(result.signalPointsDelta).toBeLessThanOrEqual(150)
  })

  it('always appends the educational disclaimer note', () => {
    const result = simulate([tradeline({ id: 't1' })], new Set(['t1']))
    expect(result.notes[result.notes.length - 1]).toMatch(/Educational estimate/i)
  })
})
